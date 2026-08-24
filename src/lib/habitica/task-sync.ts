import {
  getTask,
  listSubtasks,
  logSync,
  setTaskHabiticaId,
  listTasks,
} from "../db/queries";
import { HabiticaClient, HabiticaError } from "./client";
import { completeTaskInHabitica, pushTask } from "./sync";
import { getHabiticaClient } from "./client-factory";
import type { Difficulty } from "../task-utils";

/**
 * Sync one local task to Habitica. Never throws on sync failure — it logs to
 * `sync_log` and returns false so callers (UI/queue) are not blocked.
 */
export async function syncTaskToHabitica(
  taskId: number,
  client?: HabiticaClient,
): Promise<boolean> {
  const task = await getTask(taskId);
  if (!task) return false;

  try {
    const c = client ?? (await getHabiticaClient());

    // Completed local tasks that already exist in Habitica → score up.
    if (task.status === "done" && task.habiticaId) {
      await completeTaskInHabitica(c, task.habiticaId);
      await logSync({
        taskId,
        direction: "to_habitica",
        action: "complete",
        status: "success",
        habiticaId: task.habiticaId,
      });
      return true;
    }

    const subs = await listSubtasks([task.id]);

    const result = await pushTask(c, {
      id: task.id,
      title: task.title,
      notes: task.notes,
      difficulty: (task.difficulty ?? "easy") as Difficulty,
      checklist: subs.map((s) => ({ title: s.title, completed: s.completed })),
      status: task.status,
      habiticaId: task.habiticaId,
      habiticaType: task.habiticaType,
    });

    if (result.created) {
      await setTaskHabiticaId(task.id, result.habiticaId, result.habiticaType);
    }

    await logSync({
      taskId,
      direction: "to_habitica",
      action: result.created ? "create" : "update",
      status: "success",
      habiticaId: result.habiticaId,
    });
    return true;
  } catch (err) {
    const message = err instanceof HabiticaError ? err.message : String(err);
    await logSync({
      taskId,
      direction: "to_habitica",
      action: "update",
      status: "error",
      habiticaId: task.habiticaId,
      message,
    });
    return false;
  }
}

/** Delete a task in Habitica (fire-and-forget after local delete). */
export async function deleteTaskInHabitica(
  habiticaId: string,
  taskId: number | null,
): Promise<boolean> {
  try {
    const c = await getHabiticaClient();
    await c.deleteTask(habiticaId);
    await logSync({
      taskId,
      direction: "to_habitica",
      action: "delete",
      status: "success",
      habiticaId,
    });
    return true;
  } catch (err) {
    await logSync({
      taskId,
      direction: "to_habitica",
      action: "delete",
      status: "error",
      habiticaId,
      message: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/** Sync every local task (manual / scheduled trigger). */
export async function syncAllTasks(
  client?: HabiticaClient,
): Promise<{ synced: number; failed: number }> {
  const all = await listTasks({ includeArchived: true });
  let synced = 0;
  let failed = 0;
  for (const task of all) {
    const ok = await syncTaskToHabitica(task.id, client);
    if (ok) synced++;
    else failed++;
  }
  return { synced, failed };
}
