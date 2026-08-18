import {
  createSubtask as dbCreateSubtask,
  createTask as dbCreateTask,
  getSetting,
  getTask,
  listSubtasks,
  listTasks,
  logSync,
  setSetting,
  setTaskHabiticaId,
} from "../db/queries";
import { getSavedHabiticaSettings } from "../settings";
import { HabiticaClient, HabiticaError } from "./client";
import { checklistToSubtasks, habiticaPriorityToDifficulty } from "./mapping";
import type { CachedHabiticaStats } from "./types";
import { completeTaskInHabitica, pushTask } from "./sync";
import type { Difficulty } from "../task-utils";

export async function getHabiticaClient(): Promise<HabiticaClient> {
  const saved = await getSavedHabiticaSettings();
  const userId = saved.userId ?? process.env.HABITICA_USER_ID;
  const apiToken = saved.apiToken ?? process.env.HABITICA_API_TOKEN;
  if (!userId || !apiToken) {
    throw new Error(
      "Habitica credentials missing — add them in Settings or set HABITICA_USER_ID / HABITICA_API_TOKEN",
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
  taskId: number,
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

// ── Import (pull Habitica → Mission Control) ─────────────────
export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
}

/**
 * Pull Habitica todos into Mission Control. Idempotent: tasks already linked
 * (by `habitica_id`) are skipped, so re-runs never duplicate.
 */
export async function importFromHabitica(
  client?: HabiticaClient,
): Promise<ImportResult> {
  const c = client ?? (await getHabiticaClient());
  const existing = await listTasks({ includeArchived: true });
  const existingIds = new Set(
    existing.map((t) => t.habiticaId).filter((id): id is string => Boolean(id)),
  );

  const todos = await c.listTasks("todos");
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const todo of todos) {
    try {
      if (existingIds.has(todo.id)) {
        skipped++;
        continue;
      }

      const dueDate =
        todo.date && !isNaN(Date.parse(todo.date)) ? new Date(todo.date) : null;

      const task = await dbCreateTask({
        title: todo.text,
        notes: todo.notes ?? null,
        priority: "medium",
        difficulty: habiticaPriorityToDifficulty(todo.priority ?? 1),
        status: "todo",
        dueDate,
        habiticaId: todo.id,
        habiticaType: "todo",
      });

      const checklist = checklistToSubtasks(todo.checklist);
      for (let i = 0; i < checklist.length; i++) {
        await dbCreateSubtask({
          taskId: task.id,
          title: checklist[i].title,
          completed: checklist[i].completed,
          position: i,
        });
      }

      await logSync({
        taskId: task.id,
        direction: "from_habitica",
        action: "create",
        status: "success",
        habiticaId: todo.id,
      });
      imported++;
    } catch (err) {
      failed++;
      await logSync({
        taskId: null,
        direction: "from_habitica",
        action: "create",
        status: "error",
        habiticaId: todo.id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { imported, skipped, failed };
}

// ── Stats (cached) ───────────────────────────────────────────


const STATS_KEY = "habiticaStats";

export async function getCachedHabiticaStats(): Promise<CachedHabiticaStats | null> {
  const raw = await getSetting(STATS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedHabiticaStats;
  } catch {
    return null;
  }
}

export async function refreshHabiticaStats(
  client?: HabiticaClient,
): Promise<CachedHabiticaStats> {
  const c = client ?? (await getHabiticaClient());
  const s = await c.getUserStats();
  const cached: CachedHabiticaStats = {
    lvl: s.lvl,
    exp: s.exp,
    toNextLevel: s.toNextLevel,
    gp: s.gp,
    hp: s.hp,
    maxHealth: s.maxHealth,
    mp: s.mp,
    maxMP: s.maxMP,
    class: s.class,
    fetchedAt: Date.now(),
  };
  await setSetting(STATS_KEY, JSON.stringify(cached));
  return cached;
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
