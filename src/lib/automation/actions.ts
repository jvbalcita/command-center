"use server";

import { db } from "@/lib/db";
import { habits, dailies, syncLog, activity, tasks, subtasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { HabiticaClient } from "@/lib/habitica/client";
import { difficultyToHabiticaPriority, subtasksToChecklist } from "@/lib/habitica/mapping";
import { getSettings } from "@/lib/db/queries";

async function getHabiticaClientInstance(): Promise<HabiticaClient> {
  const settings = await getSettings();
  const userId = settings.habiticaUserId ?? "";
  const apiToken = settings.habiticaApiToken ?? "";
  if (!userId || !apiToken) throw new Error("Habitica credentials not configured");
  return new HabiticaClient({ userId, apiToken });
}

export async function scoreHabitAction(habitId: number, direction: "up" | "down") {
  const habit = await db.select().from(habits).where(eq(habits.id, habitId)).limit(1);
  if (habit.length === 0) throw new Error("Habit not found");

  const h = habit[0];
  if (!h.habiticaId) throw new Error("Habit not linked to Habitica");

  const client = await getHabiticaClientInstance();
  const response = await client.scoreTask(h.habiticaId, direction);

  // Atomic transaction: update counters + sync log + activity log
  const result = db.transaction((tx: any) => {
    const newCounterUp = direction === "up" ? h.counterUp + 1 : h.counterUp;
    const newCounterDown = direction === "down" ? h.counterDown + 1 : h.counterDown;

    tx
      .update(habits)
      .set({
        counterUp: newCounterUp,
        counterDown: newCounterDown,
        lastSyncedAt: new Date(Date.now()),
        updatedAt: new Date(Date.now()),
      })
      .where(eq(habits.id, habitId));

    tx.insert(syncLog).values({
      direction: "to_habitica",
      action: "update",
      status: "success",
      habiticaId: h.habiticaId,
      message: `Scored habit ${direction}`,
    });

    tx.insert(activity).values({
      type: "habit_scored",
      entityType: "habit",
      entityId: habitId,
      summary: JSON.stringify({ habit: h.title, direction, habiticaId: h.habiticaId }),
    });

    return { success: true };
  });

  // Trigger automation rules outside transaction (reads from committed state)
  const { runAutomation } = await import("@/lib/automation/rules");
  await runAutomation({ type: "habit_scored", habitId, direction });

  return { ...result, data: response };
}

export async function completeDailyAction(dailyId: number) {
  const daily = await db.select().from(dailies).where(eq(dailies.id, dailyId)).limit(1);
  if (daily.length === 0) throw new Error("Daily not found");

  const d = daily[0];
  if (!d.habiticaId) throw new Error("Daily not linked to Habitica");
  if (d.completedToday) throw new Error("Daily already completed today");

  const client = await getHabiticaClientInstance();
  const response = await client.scoreTask(d.habiticaId);

  // Atomic transaction: update daily + sync log + activity log
  db.transaction((tx: any) => {
    tx
      .update(dailies)
      .set({
        completedToday: true,
        lastCompletedAt: new Date(Date.now()),
        streak: d.streak + 1,
        lastSyncedAt: new Date(Date.now()),
        updatedAt: new Date(Date.now()),
      })
      .where(eq(dailies.id, dailyId));

    tx.insert(syncLog).values({
      direction: "to_habitica",
      action: "complete",
      status: "success",
      habiticaId: d.habiticaId,
      message: "Completed daily",
    });

    tx.insert(activity).values({
      type: "daily_completed",
      entityType: "daily",
      entityId: dailyId,
      summary: JSON.stringify({ daily: d.title, habiticaId: d.habiticaId }),
    });
  });

  // Trigger automation rules outside transaction
  const { runAutomation } = await import("@/lib/automation/rules");
  await runAutomation({ type: "daily_completed", dailyId });

  return { success: true, data: response };
}

export async function uncompleteDailyAction(dailyId: number) {
  const daily = await db.select().from(dailies).where(eq(dailies.id, dailyId)).limit(1);
  if (daily.length === 0) throw new Error("Daily not found");

  const d = daily[0];
  if (!d.habiticaId) throw new Error("Daily not linked to Habitica");
  if (!d.completedToday) throw new Error("Daily not completed today");

  // Atomic transaction: update daily + activity log
  db.transaction((tx: any) => {
    tx
      .update(dailies)
      .set({
        completedToday: false,
        streak: Math.max(0, d.streak - 1),
        updatedAt: new Date(Date.now()),
      })
      .where(eq(dailies.id, dailyId));

    tx.insert(activity).values({
      type: "daily_uncompleted",
      entityType: "daily",
      entityId: dailyId,
      summary: JSON.stringify({ daily: d.title, habiticaId: d.habiticaId }),
    });
  });

  return { success: true };
}

export async function createTaskAction(input: {
  title: string;
  notes?: string;
  priority?: "low" | "medium" | "high";
  difficulty?: "trivial" | "easy" | "medium" | "hard";
  dueDate?: number;
  projectId?: number;
  subtasks?: Array<{ title: string; completed: boolean }>;
}) {
  const client = await getHabiticaClientInstance();

  const habiticaTask = await client.createTask({
    text: input.title,
    notes: input.notes,
    type: "todo",
    priority: input.difficulty ? difficultyToHabiticaPriority(input.difficulty) as 0.1 | 1 | 1.5 | 2 : 1,
    date: input.dueDate ? new Date(input.dueDate).toISOString().split("T")[0] : undefined,
    checklist: input.subtasks?.map(s => ({ text: s.title, completed: s.completed })),
  });

  // Insert task first (needs returning), then wrap the rest in a transaction
  const [newTask] = await db
    .insert(tasks)
    .values({
      title: input.title,
      notes: input.notes,
      priority: input.priority || "medium",
      difficulty: input.difficulty || "easy",
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      projectId: input.projectId,
      habiticaId: habiticaTask.id,
      habiticaType: "todo",
      status: "todo",
    })
    .returning();

  // Atomic transaction: insert subtasks + sync log + activity log
  db.transaction((tx: any) => {
    if (input.subtasks && input.subtasks.length > 0) {
      tx.insert(subtasks).values(
        input.subtasks.map((s, i) => ({
          taskId: newTask.id,
          title: s.title,
          completed: s.completed,
          position: i,
        }))
      );
    }

    tx.insert(syncLog).values({
      taskId: newTask.id,
      direction: "to_habitica",
      action: "create",
      status: "success",
      habiticaId: habiticaTask.id,
      message: "Created task",
    });

    tx.insert(activity).values({
      type: "task_created",
      entityType: "task",
      entityId: newTask.id,
      summary: JSON.stringify({ task: newTask.title, habiticaId: habiticaTask.id }),
    });
  });

  const task = newTask;

  // Trigger automation rules outside transaction
  const { runAutomation } = await import("@/lib/automation/rules");
  await runAutomation({ type: "task_created", taskId: task.id });

  return { success: true, task };
}

export async function completeTaskAction(taskId: number) {
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (task.length === 0) throw new Error("Task not found");

  const t = task[0];
  if (t.status === "done") throw new Error("Task already completed");

  if (t.habiticaId) {
    const client = await getHabiticaClientInstance();
    await client.scoreTask(t.habiticaId);

    await db.insert(syncLog).values({
      taskId: t.id,
      direction: "to_habitica",
      action: "complete",
      status: "success",
      habiticaId: t.habiticaId,
      message: "Completed task",
    });
  }

  // Atomic transaction: update task status + activity log
  db.transaction((tx: any) => {
    tx
      .update(tasks)
      .set({
        status: "done",
        completedAt: new Date(Date.now()),
        updatedAt: new Date(Date.now()),
      })
      .where(eq(tasks.id, taskId));

    tx.insert(activity).values({
      type: "task_completed",
      entityType: "task",
      entityId: taskId,
      summary: JSON.stringify({ task: t.title, habiticaId: t.habiticaId }),
    });
  });

  // Trigger automation rules outside transaction
  const { runAutomation } = await import("@/lib/automation/rules");
  await runAutomation({ type: "task_completed", taskId });

  return { success: true };
}

export async function syncNowAction() {
  const { importAllFromHabitica } = await import("@/lib/habitica/service");
  const result = await importAllFromHabitica();
  
  // Trigger automation rules for successful pull
  const { runAutomation } = await import("@/lib/automation/rules");
  await runAutomation({ type: "pull_succeeded" });
  
  return result;
}
