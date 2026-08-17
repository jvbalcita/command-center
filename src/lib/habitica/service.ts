import { getTask, listTasks, logSync, setTaskHabiticaId } from "../db/queries";
import { HabiticaClient, HabiticaError } from "./client";
import { completeTaskInHabitica, pushTask } from "./sync";

export function getHabiticaClient(): HabiticaClient {
  const userId = process.env.HABITICA_USER_ID;
  const apiToken = process.env.HABITICA_API_TOKEN;
  if (!userId || !apiToken) {
    throw new Error(
      "Habitica credentials missing — set HABITICA_USER_ID and HABITICA_API_TOKEN",
    );
  }
  return new HabiticaClient({ userId, apiToken });
}

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
    const c = client ?? getHabiticaClient();

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

    const result = await pushTask(c, {
      id: task.id,
      title: task.title,
      notes: task.notes,
      priority: task.priority,
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

/** Sync every task (manual / scheduled trigger). */
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

// ── Minimal in-memory queue ─────────────────────────────────
// Fire-and-forget: enqueue a task to sync without blocking the caller.
// NOTE: ephemeral per-instance; the durable trigger is `sync:run` / a cron
// calling syncAllTasks().
const queue: number[] = [];
let processing = false;

export function enqueueTaskSync(taskId: number): void {
  if (!queue.includes(taskId)) queue.push(taskId);
  void drainQueue();
}

async function drainQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    while (queue.length) {
      const id = queue.shift()!;
      await syncTaskToHabitica(id).catch(() => undefined);
    }
  } finally {
    processing = false;
  }
}
