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
} from "./db/queries";
import { createProjectSchema, taskSchema, type ActionState } from "./validation";
import { getSavedHabiticaSettings, saveHabiticaSettings } from "./settings";
import { HabiticaClient } from "./habitica/client";
import type { CachedHabiticaStats } from "./habitica/types";
import {
  deleteTaskInHabitica,
  enqueueTaskSync,
  importFromHabitica,
  refreshHabiticaStats,
  syncAllTasks,
} from "./habitica/service";
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
