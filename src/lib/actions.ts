"use server";

import { revalidatePath } from "next/cache";
import {
  archiveProject as dbArchiveProject,
  clearProjectFromTasks,
  completeTask,
  createProject as dbCreateProject,
  createSubtask as dbCreateSubtask,
  createTask as dbCreateTask,
  deleteSubtasksByTask,
  deleteTask as dbDeleteTask,
  getProject,
  getTask,
  logActivity,
  reopenTask,
  setTaskStatus,
  updateProject as dbUpdateProject,
  updateTask as dbUpdateTask,
  incrementHabitCounter,
  completeDaily,
  uncompleteDaily,
  getHabit,
  getDaily,
  logSync,
  createHabit as dbCreateHabit,
  updateHabit as dbUpdateHabit,
  deleteHabit as dbDeleteHabit,
  createDaily as dbCreateDaily,
  updateDaily as dbUpdateDaily,
  deleteDaily as dbDeleteDaily,
  reorderHabits as dbReorderHabits,
  reorderDailies as dbReorderDailies,
  listSubtasks,
  updateSubtask,
} from "./db/queries";
import { isCompletedToday } from "./daily-state";
import { createProjectSchema, habitSchema, dailySchema, taskSchema, type ActionState } from "./validation";
import { getSavedHabiticaSettings, saveHabiticaSettings } from "./settings";
import { HabiticaClient } from "./habitica/client";
import type { CachedHabiticaStats } from "./habitica/types";
import {
  deleteTaskInHabitica,
  enqueueTaskSync,
  getHabiticaClient,
  importFromHabitica,
  importHabits,
  importDailies,
  importAllFromHabitica,
  pushDailyToHabitica,
  pushHabitToHabitica,
  refreshHabiticaStats,
  scoreHabitInHabitica,
  completeDailyInHabitica,
  uncompleteDailyInHabitica,
  syncAllTasks,
} from "./habitica/service";
import { subtasksToChecklist } from "./habitica/mapping";
import type { Task } from "./db/schema";

const STATUS_LABEL: Record<Task["status"], string> = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
};

function toDueDate(value: string | undefined): Date | null {
  if (!value) return null;
  return new Date(`${value}T12:00:00`);
}

interface ChecklistDraft {
  title: string;
  completed: boolean;
}

function parseChecklist(raw: string): ChecklistDraft[] {
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => ({
        title: String(x?.title ?? "").trim(),
        completed: Boolean(x?.completed),
      }))
      .filter((x) => x.title.length > 0 && x.title.length <= 200);
  } catch {
    return [];
  }
}

async function saveChecklist(taskId: number, items: ChecklistDraft[]): Promise<void> {
  await deleteSubtasksByTask(taskId);
  for (let i = 0; i < items.length; i++) {
    await dbCreateSubtask({
      taskId,
      title: items[i].title,
      completed: items[i].completed,
      position: i,
    });
  }
}

export async function createProjectAction(formData: FormData): Promise<ActionState> {
  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const project = await dbCreateProject({
    name: parsed.data.name,
    color: parsed.data.color ?? "#0d9488",
  });
  await logActivity({
    type: "project_created",
    entityType: "project",
    entityId: project.id,
    summary: `Created project "${project.name}"`,
  });
  revalidatePath("/");
  return { ok: true };
}

export async function createTaskAction(formData: FormData): Promise<ActionState> {
  const projectIdRaw = String(formData.get("projectId") ?? "");
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes") || undefined,
    priority: formData.get("priority") || "medium",
    difficulty: formData.get("difficulty") || "easy",
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const checklist = parseChecklist(String(formData.get("checklist") ?? ""));
  const task = await dbCreateTask({
    title: parsed.data.title,
    notes: parsed.data.notes ?? null,
    priority: parsed.data.priority,
    difficulty: parsed.data.difficulty,
    dueDate: toDueDate(parsed.data.dueDate),
    projectId: projectIdRaw ? Number(projectIdRaw) : null,
  });
  await saveChecklist(task.id, checklist);
  await logActivity({
    type: "task_created",
    entityType: "task",
    entityId: task.id,
    summary: `Created "${task.title}"`,
  });
  enqueueTaskSync(task.id);
  revalidatePath("/");
  return { ok: true };
}

export async function updateTaskAction(
  taskId: number,
  formData: FormData,
): Promise<ActionState> {
  const projectIdRaw = String(formData.get("projectId") ?? "");
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes") || undefined,
    priority: formData.get("priority") || "medium",
    difficulty: formData.get("difficulty") || "easy",
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const checklist = parseChecklist(String(formData.get("checklist") ?? ""));
  await dbUpdateTask(taskId, {
    title: parsed.data.title,
    notes: parsed.data.notes ?? null,
    priority: parsed.data.priority,
    difficulty: parsed.data.difficulty,
    dueDate: toDueDate(parsed.data.dueDate),
    projectId: projectIdRaw ? Number(projectIdRaw) : null,
  });
  await saveChecklist(taskId, checklist);
  enqueueTaskSync(taskId);
  revalidatePath("/");
  return { ok: true };
}

export async function toggleTaskCompleteAction(taskId: number): Promise<void> {
  const task = await getTask(taskId);
  if (!task) return;
  if (task.status === "done") {
    await reopenTask(taskId);
    await logActivity({
      type: "task_reopened",
      entityType: "task",
      entityId: taskId,
      summary: `Reopened "${task.title}"`,
    });
  } else {
    await completeTask(taskId);
    await logActivity({
      type: "task_completed",
      entityType: "task",
      entityId: taskId,
      summary: `Completed "${task.title}"`,
    });
  }
  enqueueTaskSync(taskId);
  revalidatePath("/");
}

export async function moveTaskAction(taskId: number, status: Task["status"]): Promise<void> {
  const task = await getTask(taskId);
  if (!task) return;
  await setTaskStatus(taskId, status);
  await logActivity({
    type: "task_moved",
    entityType: "task",
    entityId: taskId,
    summary: `Moved "${task.title}" to ${STATUS_LABEL[status]}`,
  });
  enqueueTaskSync(taskId);
  revalidatePath("/");
}

export async function deleteTaskAction(taskId: number): Promise<void> {
  const task = await getTask(taskId);
  await dbDeleteTask(taskId);
  if (task?.habiticaId) {
    void deleteTaskInHabitica(task.habiticaId, taskId);
  }
  if (task) {
    await logActivity({
      type: "task_deleted",
      entityType: "task",
      entityId: taskId,
      summary: `Deleted "${task.title}"`,
    });
  }
  revalidatePath("/");
}


export async function toggleSubtaskAction(subtaskId: number): Promise<ActionState> {
  // 1. Find the subtask and toggle its completed field
  const updated = await updateSubtask(subtaskId, {
    completed: (await listSubtasks([subtaskId])).find(s => s.id === subtaskId)?.completed
      ? false   // currently completed → uncomplete
      : true,   // currently incomplete → complete
  });
  if (!updated) {
    return { ok: false, error: "Subtask not found" };
  }

  // 2. Look up the parent task
  const task = await getTask(updated.taskId);
  if (!task) {
    return { ok: false, error: "Parent task not found" };
  }

  // 3. Sync checklist to Habitica if linked
  if (task.habiticaId) {
    try {
      const allSubtasks = await listSubtasks([task.id]);
      const client = await getHabiticaClient();
      await client.updateTask(task.habiticaId, {
        checklist: subtasksToChecklist(allSubtasks),
      });
    } catch (err) {
      return {
        ok: false,
        error: `Habitica sync failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  // 4. Log activity
  await logActivity({
    type: "subtask_toggled",
    entityType: "subtask",
    entityId: subtaskId,
    summary: JSON.stringify({
      subtask: updated.title,
      completed: updated.completed,
      task: task.title,
    }),
  });

  revalidatePath("/");
  return { ok: true };
}


export async function updateProjectAction(
  projectId: number,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await dbUpdateProject(projectId, {
    name: parsed.data.name,
    color: parsed.data.color ?? "#0d9488",
  });
  await logActivity({
    type: "project_updated",
    entityType: "project",
    entityId: projectId,
    summary: `Renamed project to "${parsed.data.name}"`,
  });
  revalidatePath("/");
  return { ok: true };
}

export async function archiveProjectAction(projectId: number): Promise<void> {
  const project = await getProject(projectId);
  await dbArchiveProject(projectId);
  await clearProjectFromTasks(projectId);
  if (project) {
    await logActivity({
      type: "project_archived",
      entityType: "project",
      entityId: projectId,
      summary: `Deleted project "${project.name}"`,
    });
  }
  revalidatePath("/");
}

// ── Habitica settings / sync ────────────────────────────────
export async function saveHabiticaSettingsAction(
  formData: FormData,
): Promise<ActionState> {
  const userId = String(formData.get("userId") ?? "").trim();
  const apiToken = String(formData.get("apiToken") ?? "").trim();
  if (!userId) {
    return { ok: false, error: "User ID is required." };
  }

  let finalToken = apiToken;
  if (!finalToken) {
    // Keep the existing saved token when the field is left blank.
    const saved = await getSavedHabiticaSettings();
    finalToken = saved.apiToken ?? "";
  }
  if (!finalToken) {
    return { ok: false, error: "API Token is required (no saved token to keep)." };
  }

  await saveHabiticaSettings({ userId, apiToken: finalToken });
  return { ok: true };
}

export async function testHabiticaConnectionAction(
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  const userId = String(formData.get("userId") ?? "").trim();
  const apiToken = String(formData.get("apiToken") ?? "").trim();

  let finalToken = apiToken;
  if (!finalToken) {
    const saved = await getSavedHabiticaSettings();
    finalToken = saved.apiToken ?? "";
  }
  if (!userId || !finalToken) {
    return { ok: false, message: "Enter a User ID and API Token." };
  }

  try {
    const client = new HabiticaClient({ userId, apiToken: finalToken });
    const user = await client.getUser();
    return { ok: true, message: `Connected — Habitica user ${user.id}` };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

export async function syncNowAction(): Promise<{ ok: boolean; message: string }> {
  try {
    const result = await syncAllTasks();
    return {
      ok: true,
      message: `Synced ${result.synced} task(s), ${result.failed} failed`,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Sync failed" };
  }
}

export async function importFromHabiticaAction(): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    const result = await importFromHabitica();
    revalidatePath("/");
    return {
      ok: true,
      message: `Imported ${result.imported} from Habitica (skipped ${result.skipped}, failed ${result.failed})`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Import failed",
    };
  }
}

export async function refreshHabiticaStatsAction(): Promise<{
  ok: boolean;
  stats?: CachedHabiticaStats;
  error?: string;
}> {
  try {
    const stats = await refreshHabiticaStats();
    revalidatePath("/");
    return { ok: true, stats };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to refresh stats",
    };
  }
}

// ── Habit & Daily actions ─────────────────────────────────────
async function logHabiticaFailure(
  habiticaId: string,
  action: "update" | "complete",
  err: unknown,
): Promise<void> {
  await logSync({
    taskId: null,
    direction: "to_habitica",
    action,
    status: "error",
    habiticaId,
    message: err instanceof Error ? err.message : String(err),
  });
}

export async function scoreHabitAction(
  habitId: number,
  direction: "up" | "down",
): Promise<void> {
  const habit = await getHabit(habitId);
  if (!habit) return;

  await incrementHabitCounter(habitId, direction);
  await logActivity({
    type: `habit_scored_${direction}`,
    entityType: "habit",
    entityId: habitId,
    summary: `Scored ${direction} on "${habit.title}"`,
  });

  if (habit.habiticaId) {
    try {
      const client = await getHabiticaClient();
      await scoreHabitInHabitica(client, habit.habiticaId, direction);
    } catch (err) {
      await logHabiticaFailure(habit.habiticaId, "update", err);
    }
  }
  revalidatePath("/");
}

export async function completeDailyAction(dailyId: number): Promise<void> {
  const daily = await getDaily(dailyId);
  if (!daily) return;
  if (isCompletedToday(daily, new Date())) return;

  await completeDaily(dailyId);
  await logActivity({
    type: "daily_completed",
    entityType: "daily",
    entityId: dailyId,
    summary: `Completed daily "${daily.title}"`,
  });

  if (daily.habiticaId) {
    try {
      const client = await getHabiticaClient();
      await completeDailyInHabitica(client, daily.habiticaId);
    } catch (err) {
      await logHabiticaFailure(daily.habiticaId, "complete", err);
    }
  }
  revalidatePath("/");
}

export async function uncompleteDailyAction(dailyId: number): Promise<void> {
  const daily = await getDaily(dailyId);
  if (!daily) return;
  if (!isCompletedToday(daily, new Date())) return;

  await uncompleteDaily(dailyId);
  await logActivity({
    type: "daily_uncompleted",
    entityType: "daily",
    entityId: dailyId,
    summary: `Uncompleted daily "${daily.title}"`,
  });

  if (daily.habiticaId) {
    try {
      const client = await getHabiticaClient();
      await uncompleteDailyInHabitica(client, daily.habiticaId);
    } catch (err) {
      await logHabiticaFailure(daily.habiticaId, "update", err);
    }
  }
  revalidatePath("/");
}

function formatImportMessage(
  kind: string,
  result: { imported: number; updated: number; failed: number },
): string {
  return `Imported ${result.imported} ${kind} from Habitica (updated ${result.updated}, failed ${result.failed})`;
}

export async function importHabitsAction(): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    const result = await importHabits();
    revalidatePath("/");
    return { ok: true, message: formatImportMessage("habits", result) };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Import failed",
    };
  }
}

export async function importDailiesAction(): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    const result = await importDailies();
    revalidatePath("/");
    return { ok: true, message: formatImportMessage("dailies", result) };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Import failed",
    };
  }
}

export async function importRoutinesAction(): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    const result = await importAllFromHabitica();
    revalidatePath("/");
    const imported = result.habits.imported + result.dailies.imported + result.todos.imported;
    const updated = result.habits.updated + result.dailies.updated + result.todos.updated;
    const failed = result.habits.failed + result.dailies.failed + result.todos.failed;
    return {
      ok: true,
      message: `Imported ${imported} items from Habitica (${result.habits.imported} habits, ${result.dailies.imported} dailies, ${result.todos.imported} todos; updated ${updated}, failed ${failed})`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Import failed",
    };
  }
}

export async function pullHabiticaAction(): Promise<{ ok: boolean; message: string }> {
  return importRoutinesAction();
}

export async function createHabitAction(formData: FormData): Promise<ActionState> {
  const parsed = habitSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes") || undefined,
    difficulty: formData.get("difficulty") || "easy",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const habit = await dbCreateHabit({
    title: parsed.data.title,
    notes: parsed.data.notes ?? null,
    difficulty: parsed.data.difficulty,
    sortOrder: Date.now(),
  });
  await logActivity({
    type: "habit_created",
    entityType: "habit",
    entityId: habit.id,
    summary: `Created habit "${habit.title}"`,
  });
  revalidatePath("/");
  return { ok: true };
}

export async function updateHabitAction(
  habitId: number,
  formData: FormData,
): Promise<ActionState> {
  const parsed = habitSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes") || undefined,
    difficulty: formData.get("difficulty") || "easy",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await dbUpdateHabit(habitId, {
    title: parsed.data.title,
    notes: parsed.data.notes ?? null,
    difficulty: parsed.data.difficulty,
  });
  const habit = await getHabit(habitId);
  if (habit?.habiticaId) {
    try {
      await pushHabitToHabitica(habit);
    } catch (err) {
      await logHabiticaFailure(habit.habiticaId, "update", err);
    }
  }
  revalidatePath("/");
  return { ok: true };
}

export async function deleteHabitAction(habitId: number): Promise<void> {
  const habit = await getHabit(habitId);
  await dbDeleteHabit(habitId);
  if (habit?.habiticaId) {
    void deleteTaskInHabitica(habit.habiticaId, null);
  }
  if (habit) {
    await logActivity({
      type: "habit_deleted",
      entityType: "habit",
      entityId: habitId,
      summary: `Deleted habit "${habit.title}"`,
    });
  }
  revalidatePath("/");
}

export async function createDailyAction(formData: FormData): Promise<ActionState> {
  const parsed = parseDailyForm(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error };
  }
  const daily = await dbCreateDaily({
    ...parsed.data,
    sortOrder: Date.now(),
  });
  await logActivity({
    type: "daily_created",
    entityType: "daily",
    entityId: daily.id,
    summary: `Created daily "${daily.title}"`,
  });
  revalidatePath("/");
  return { ok: true };
}

export async function updateDailyAction(
  dailyId: number,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseDailyForm(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error };
  }
  await dbUpdateDaily(dailyId, parsed.data);
  const daily = await getDaily(dailyId);
  if (daily?.habiticaId) {
    try {
      await pushDailyToHabitica(daily);
    } catch (err) {
      await logHabiticaFailure(daily.habiticaId, "update", err);
    }
  }
  revalidatePath("/");
  return { ok: true };
}

export async function deleteDailyAction(dailyId: number): Promise<void> {
  const daily = await getDaily(dailyId);
  await dbDeleteDaily(dailyId);
  if (daily?.habiticaId) {
    void deleteTaskInHabitica(daily.habiticaId, null);
  }
  if (daily) {
    await logActivity({
      type: "daily_deleted",
      entityType: "daily",
      entityId: dailyId,
      summary: `Deleted daily "${daily.title}"`,
    });
  }
  revalidatePath("/");
}

export async function reorderHabitsAction(ids: number[]): Promise<void> {
  await dbReorderHabits(ids);
  revalidatePath("/");
}

export async function reorderDailiesAction(ids: number[]): Promise<void> {
  await dbReorderDailies(ids);
  revalidatePath("/");
}

function parseJsonNumberArray(raw: string): number[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;
    return parsed.map(Number);
  } catch {
    return undefined;
  }
}

function parseDailyForm(formData: FormData):
  | {
      success: true;
      data: {
        title: string;
        notes: string | null;
        difficulty: "trivial" | "easy" | "medium" | "hard";
        frequency: "daily" | "weekly" | "monthly" | "yearly";
        everyX: number;
        startDate: Date | null;
        repeatDays: string | null;
        daysOfMonth: string | null;
        weeksOfMonth: string | null;
      };
    }
  | { success: false; error: string } {
  const repeatDays = parseJsonNumberArray(String(formData.get("repeatDays") ?? ""));
  const daysOfMonth = parseJsonNumberArray(String(formData.get("daysOfMonth") ?? ""));
  const weeksOfMonth = parseJsonNumberArray(String(formData.get("weeksOfMonth") ?? ""));
  const parsed = dailySchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes") || undefined,
    difficulty: formData.get("difficulty") || "easy",
    frequency: formData.get("frequency") || "daily",
    everyX: formData.get("everyX") || 1,
    startDate: formData.get("startDate") || undefined,
    repeatDays,
    daysOfMonth,
    weeksOfMonth,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const startDate = parsed.data.startDate
    ? new Date(`${parsed.data.startDate}T12:00:00`)
    : null;
  return {
    success: true,
    data: {
      title: parsed.data.title,
      notes: parsed.data.notes ?? null,
      difficulty: parsed.data.difficulty,
      frequency: parsed.data.frequency,
      everyX: parsed.data.everyX,
      startDate: startDate && !isNaN(startDate.getTime()) ? startDate : null,
      repeatDays:
        (parsed.data.frequency === "weekly" || parsed.data.frequency === "monthly") &&
        parsed.data.repeatDays?.length
          ? JSON.stringify(parsed.data.repeatDays)
          : null,
      daysOfMonth:
        parsed.data.frequency === "monthly" && parsed.data.daysOfMonth?.length
          ? JSON.stringify(parsed.data.daysOfMonth)
          : null,
      weeksOfMonth:
        parsed.data.frequency === "monthly" && parsed.data.weeksOfMonth?.length
          ? JSON.stringify(parsed.data.weeksOfMonth)
          : null,
    },
  };
}
