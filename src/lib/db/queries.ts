import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { isDailyDueOn, needsRollover, nextCompleteDaily, nextUncompleteDaily } from "@/lib/daily-state";
import { db } from "./index";
import {
  activity,
  automationRules,
  dailies,
  habits,
  projects,
  settings,
  subtasks,
  syncLog,
  tasks,
  type ActivityRow,
  type AutomationRule,
  type Daily,
  type Habit,
  type NewAutomationRule,
  type NewDaily,
  type NewHabit,
  type NewProject,
  type NewSubtask,
  type NewSyncLog,
  type NewTask,
  type Project,
  type SettingRow,
  type Subtask,
  type Task,
} from "./schema";

// ── Projects ─────────────────────────────────────────────────
export async function listProjects(includeArchived = false): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(includeArchived ? undefined : eq(projects.isArchived, false))
    .orderBy(asc(projects.sortOrder), asc(projects.name));
}

export async function getProject(id: number): Promise<Project | null> {
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createProject(input: NewProject): Promise<Project> {
  const rows = await db.insert(projects).values(input).returning();
  return rows[0];
}

export async function updateProject(
  id: number,
  patch: Partial<NewProject>,
): Promise<Project | null> {
  const rows = await db
    .update(projects)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function archiveProject(id: number): Promise<Project | null> {
  const rows = await db
    .update(projects)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  return rows[0] ?? null;
}

// ── Tasks ────────────────────────────────────────────────────
export async function clearProjectFromTasks(projectId: number): Promise<void> {
  await db
    .update(tasks)
    .set({ projectId: null, updatedAt: new Date() })
    .where(eq(tasks.projectId, projectId));
}

export async function listTasks(
  opts: {
    projectId?: number | null;
    status?: Task["status"];
    includeArchived?: boolean;
  } = {},
): Promise<Task[]> {
  // projectId: undefined = all, null = inbox (no project), number = filter
  const projectCond =
    opts.projectId === undefined
      ? undefined
      : opts.projectId === null
        ? isNull(tasks.projectId)
        : eq(tasks.projectId, opts.projectId);

  return db
    .select()
    .from(tasks)
    .where(
      and(
        projectCond,
        opts.status ? eq(tasks.status, opts.status) : undefined,
        opts.includeArchived ? undefined : eq(tasks.isArchived, false),
      ),
    )
    .orderBy(asc(tasks.sortOrder), desc(tasks.createdAt));
}

export async function getTask(id: number): Promise<Task | null> {
  const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createTask(input: NewTask): Promise<Task> {
  const rows = await db.insert(tasks).values(input).returning();
  return rows[0];
}

export async function updateTask(
  id: number,
  patch: Partial<NewTask>,
): Promise<Task | null> {
  const rows = await db
    .update(tasks)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function completeTask(id: number): Promise<Task | null> {
  const rows = await db
    .update(tasks)
    .set({ status: "done", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function reopenTask(id: number): Promise<Task | null> {
  const rows = await db
    .update(tasks)
    .set({ status: "todo", completedAt: null, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function archiveTask(id: number): Promise<Task | null> {
  const rows = await db
    .update(tasks)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteTask(id: number): Promise<void> {
  await db.delete(tasks).where(eq(tasks.id, id));
}

// ── Subtasks (checklist) ────────────────────────────────────
export async function listSubtasks(taskIds?: number[]): Promise<Subtask[]> {
  if (taskIds !== undefined && taskIds.length === 0) return [];
  const cond = taskIds !== undefined ? inArray(subtasks.taskId, taskIds) : undefined;
  return db
    .select()
    .from(subtasks)
    .where(cond)
    .orderBy(asc(subtasks.position), asc(subtasks.id));
}

export async function createSubtask(input: NewSubtask): Promise<Subtask> {
  const rows = await db.insert(subtasks).values(input).returning();
  return rows[0];
}

export async function updateSubtask(
  id: number,
  patch: Partial<NewSubtask>,
): Promise<Subtask | null> {
  const rows = await db
    .update(subtasks)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(subtasks.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteSubtask(id: number): Promise<void> {
  await db.delete(subtasks).where(eq(subtasks.id, id));
}

export async function deleteSubtasksByTask(taskId: number): Promise<void> {
  await db.delete(subtasks).where(eq(subtasks.taskId, taskId));
}


// ── Habitica sync helpers ───────────────────────────────────
export async function setTaskHabiticaId(
  id: number,
  habiticaId: string,
  habiticaType: "habit" | "daily" | "todo" | "reward",
): Promise<void> {
  await db
    .update(tasks)
    .set({ habiticaId, habiticaType, updatedAt: new Date() })
    .where(eq(tasks.id, id));
}

export async function logSync(input: NewSyncLog): Promise<void> {
  await db.insert(syncLog).values(input);
}

export async function setTaskStatus(
  id: number,
  status: Task["status"],
): Promise<Task | null> {
  const rows = await db
    .update(tasks)
    .set({
      status,
      completedAt: status === "done" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, id))
    .returning();
  return rows[0] ?? null;
}

// ── Activity ────────────────────────────────────────────────
export async function logActivity(input: {
  type: string;
  entityType?: string | null;
  entityId?: number | null;
  summary: string;
}): Promise<void> {
  await db.insert(activity).values(input);
}

export async function listActivity(limit = 25): Promise<ActivityRow[]> {
  return db
    .select()
    .from(activity)
    .orderBy(desc(activity.createdAt))
    .limit(limit);
}

// ── Settings (key/value) ────────────────────────────────────
export async function getSetting(key: string): Promise<string | null> {
  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function listSettings(): Promise<SettingRow[]> {
  return db.select().from(settings).orderBy(asc(settings.key));
}

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(settings);
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value ?? "";
  }
  return result;
}

// ── Habits ────────────────────────────────────────────────────
export async function listHabits(): Promise<Habit[]> {
  return db.select().from(habits).orderBy(asc(habits.sortOrder), desc(habits.createdAt));
}

export async function getHabit(id: number): Promise<Habit | null> {
  const rows = await db.select().from(habits).where(eq(habits.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getHabitByHabiticaId(habiticaId: string): Promise<Habit | null> {
  const rows = await db.select().from(habits).where(eq(habits.habiticaId, habiticaId)).limit(1);
  return rows[0] ?? null;
}

export async function createHabit(input: NewHabit): Promise<Habit> {
  const rows = await db.insert(habits).values(input).returning();
  return rows[0];
}

export async function updateHabit(
  id: number,
  patch: Partial<NewHabit>,
): Promise<Habit | null> {
  const rows = await db
    .update(habits)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(habits.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteHabit(id: number): Promise<void> {
  await db.delete(habits).where(eq(habits.id, id));
}

export async function reorderHabits(ids: number[]): Promise<void> {
  const now = new Date();
  for (let i = 0; i < ids.length; i++) {
    await db
      .update(habits)
      .set({ sortOrder: i, updatedAt: now })
      .where(eq(habits.id, ids[i]));
  }
}

export async function incrementHabitCounter(
  id: number,
  direction: "up" | "down",
): Promise<Habit | null> {
  // Atomic counter update — no read-before-write race condition.
  // Uses SQL expressions to increment directly in the database.
  const column = direction === "up" ? habits.counterUp : habits.counterDown;
  const rows = await db
    .update(habits)
    .set({
      [column.name]: sql`${column} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(habits.id, id))
    .returning();
  return rows[0] ?? null;
}

// ── Dailies ───────────────────────────────────────────────────
export async function listDailies(): Promise<Daily[]> {
  const rows = await db.select().from(dailies).orderBy(asc(dailies.sortOrder), desc(dailies.createdAt));
  const now = new Date();
  const staleIds = rows.filter((d: any) => needsRollover(d, now)).map((d: any) => d.id);
  const stampIds = rows
    .filter((d: any) => d.completedToday && !d.lastCompletedAt && !staleIds.includes(d.id))
    .map((d: any) => d.id);
  if (staleIds.length > 0) {
    await db
      .update(dailies)
      .set({ completedToday: false, updatedAt: now })
      .where(inArray(dailies.id, staleIds));
  }
  if (stampIds.length > 0) {
    await db
      .update(dailies)
      .set({ lastCompletedAt: now, updatedAt: now })
      .where(inArray(dailies.id, stampIds));
  }
  if (staleIds.length === 0 && stampIds.length === 0) return rows;

  const stale = new Set(staleIds);
  const stamped = new Set(stampIds);
  return rows.map((d: any) => {
    if (stale.has(d.id)) return { ...d, completedToday: false };
    if (stamped.has(d.id)) return { ...d, lastCompletedAt: now };
    return d;
  });
}

export async function getDaily(id: number): Promise<Daily | null> {
  const rows = await db.select().from(dailies).where(eq(dailies.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getDailyByHabiticaId(habiticaId: string): Promise<Daily | null> {
  const rows = await db.select().from(dailies).where(eq(dailies.habiticaId, habiticaId)).limit(1);
  return rows[0] ?? null;
}

export async function createDaily(input: NewDaily): Promise<Daily> {
  const rows = await db.insert(dailies).values(input).returning();
  return rows[0];
}

export async function updateDaily(
  id: number,
  patch: Partial<NewDaily>,
): Promise<Daily | null> {
  const rows = await db
    .update(dailies)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(dailies.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function completeDaily(id: number): Promise<Daily | null> {
  const daily = await getDaily(id);
  if (!daily) return null;
  const now = new Date();
  const next = nextCompleteDaily(daily, now);
  if (!next) return daily;
  const rows = await db
    .update(dailies)
    .set({ ...next, updatedAt: now })
    .where(eq(dailies.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function uncompleteDaily(id: number): Promise<Daily | null> {
  const daily = await getDaily(id);
  if (!daily) return null;
  const now = new Date();
  const next = nextUncompleteDaily(daily, now);
  if (!next) return daily;
  const rows = await db
    .update(dailies)
    .set({ ...next, updatedAt: now })
    .where(eq(dailies.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteDaily(id: number): Promise<void> {
  await db.delete(dailies).where(eq(dailies.id, id));
}

export async function reorderDailies(ids: number[]): Promise<void> {
  const now = new Date();
  for (let i = 0; i < ids.length; i++) {
    await db
      .update(dailies)
      .set({ sortOrder: i, updatedAt: now })
      .where(eq(dailies.id, ids[i]));
  }
}

// ── Daily helpers ─────────────────────────────────────────────
export async function getDailiesDueToday(): Promise<Daily[]> {
  const all = await listDailies();
  const now = new Date();
  return all.filter((d) => !d.completedToday && isDailyDueOn(d, now));
}

export async function checkMissedDailies(): Promise<Daily[]> {
  // Returns dailies that were due yesterday but not completed
  const all = await listDailies();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  return all.filter((d) => {
    if (d.completedToday) return false;
    if (!d.lastCompletedAt) return true; // never completed
    const lastCompleted = new Date(d.lastCompletedAt).getTime();
    return lastCompleted < todayStart - 86_400_000; // completed before yesterday
  });
}

// ── Automation Rules ────────────────────────────────────────────
export async function listAutomationRules(): Promise<AutomationRule[]> {
  return db.select().from(automationRules).orderBy(asc(automationRules.createdAt));
}

export async function getAutomationRule(id: number): Promise<AutomationRule | null> {
  const rows = await db.select().from(automationRules).where(eq(automationRules.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createAutomationRule(input: NewAutomationRule): Promise<AutomationRule> {
  const now = new Date();
  const [rule] = await db
    .insert(automationRules)
    .values({ ...input, createdAt: now, updatedAt: now })
    .returning();
  return rule;
}

export async function updateAutomationRule(
  id: number,
  patch: Partial<Omit<NewAutomationRule, "createdAt">>
): Promise<AutomationRule | null> {
  const [rule] = await db
    .update(automationRules)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(automationRules.id, id))
    .returning();
  return rule ?? null;
}

export async function deleteAutomationRule(id: number): Promise<void> {
  await db.delete(automationRules).where(eq(automationRules.id, id));
}
