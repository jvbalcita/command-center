import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "./index";
import {
  projects,
  tasks,
  type NewProject,
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
  opts: { projectId?: number; status?: Task["status"]; includeArchived?: boolean } = {},
): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .where(
      and(
        opts.projectId != null ? eq(tasks.projectId, opts.projectId) : undefined,
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
