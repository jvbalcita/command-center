"use server";

import { revalidatePath } from "next/cache";
import {
  completeTask,
  createProject as dbCreateProject,
  createTask as dbCreateTask,
  deleteTask as dbDeleteTask,
  getTask,
  reopenTask,
  setTaskStatus,
  updateTask as dbUpdateTask,
} from "./db/queries";
import { createProjectSchema, taskSchema, type ActionState } from "./validation";
import type { Task } from "./db/schema";

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
  await dbCreateProject({ name: parsed.data.name, color: parsed.data.color ?? "#0d9488" });
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
  await dbCreateTask({
    title: parsed.data.title,
    notes: parsed.data.notes ?? null,
    priority: parsed.data.priority,
    dueDate: toDueDate(parsed.data.dueDate),
    projectId: projectIdRaw ? Number(projectIdRaw) : null,
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
  if (task.status === "done") await reopenTask(taskId);
  else await completeTask(taskId);
  revalidatePath("/");
}

export async function moveTaskAction(taskId: number, status: Task["status"]): Promise<void> {
  await setTaskStatus(taskId, status);
  revalidatePath("/");
}

export async function deleteTaskAction(taskId: number): Promise<void> {
  await dbDeleteTask(taskId);
  revalidatePath("/");
}
