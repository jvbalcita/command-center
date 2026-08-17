"use server";

import { revalidatePath } from "next/cache";
import {
  completeTask,
  createProject as dbCreateProject,
  createTask as dbCreateTask,
  deleteTask as dbDeleteTask,
  getTask,
  logActivity,
  reopenTask,
  setTaskStatus,
  updateTask as dbUpdateTask,
} from "./db/queries";
import { createProjectSchema, taskSchema, type ActionState } from "./validation";
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
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const task = await dbCreateTask({
    title: parsed.data.title,
    notes: parsed.data.notes ?? null,
    priority: parsed.data.priority,
    dueDate: toDueDate(parsed.data.dueDate),
    projectId: projectIdRaw ? Number(projectIdRaw) : null,
  });
  await logActivity({
    type: "task_created",
    entityType: "task",
    entityId: task.id,
    summary: `Created "${task.title}"`,
  });
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
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await dbUpdateTask(taskId, {
    title: parsed.data.title,
    notes: parsed.data.notes ?? null,
    priority: parsed.data.priority,
    dueDate: toDueDate(parsed.data.dueDate),
    projectId: projectIdRaw ? Number(projectIdRaw) : null,
  });
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
  revalidatePath("/");
}

export async function deleteTaskAction(taskId: number): Promise<void> {
  const task = await getTask(taskId);
  await dbDeleteTask(taskId);
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
