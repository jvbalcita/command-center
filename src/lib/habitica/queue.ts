// ── Minimal in-memory queue ─────────────────────────────────
// Fire-and-forget: enqueue a task to sync without blocking the caller.
// NOTE: ephemeral per-instance; the durable trigger is `sync:run` / a cron
// calling syncAllTasks().
import { syncTaskToHabitica } from "./task-sync";

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
