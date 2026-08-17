import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "./index";
import {
  activity,
  projects,
  settings,
  syncLog,
  tasks,
  type ActivityRow,
  type SettingRow,
  type NewProject,
  type NewSyncLog,
  type NewTask,
  type Project,
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
