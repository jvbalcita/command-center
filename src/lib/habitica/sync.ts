import type { HabiticaClient } from "./client";
import type { HabiticaPriority, HabiticaTaskType } from "./types";

export type LocalPriority = "low" | "medium" | "high";

// Mission Control priority → Habitica priority number.
// low → Easy (1), medium → Medium (1.5), high → Hard (2)
const PRIORITY_MAP: Record<LocalPriority, HabiticaPriority> = {
  low: 1,
  medium: 1.5,
  high: 2,
};

export function mapPriority(priority: LocalPriority): HabiticaPriority {
  return PRIORITY_MAP[priority] ?? 1.5;
}

export interface LocalTaskSnapshot {
  id: number;
  title: string;
  notes: string | null;
  priority: LocalPriority;
  status: "todo" | "in_progress" | "done";
  habiticaId: string | null;
  habiticaType: HabiticaTaskType | null;
}

export interface PushResult {
  habiticaId: string;
  habiticaType: HabiticaTaskType;
  created: boolean;
}

/**
 * Push a local task to Habitica.
 * Idempotent: if the task already has a `habiticaId`, it updates; otherwise it
 * creates and returns the new id. Retries will not duplicate tasks.
 */
export async function pushTask(
  client: HabiticaClient,
  task: LocalTaskSnapshot,
): Promise<PushResult> {
  const type: "habit" | "daily" | "todo" =
    task.habiticaType === "habit" || task.habiticaType === "daily"
      ? task.habiticaType
      : "todo";

  const payload = {
    text: task.title,
    type,
    notes: task.notes ?? undefined,
    priority: mapPriority(task.priority),
  };

  if (task.habiticaId) {
    await client.updateTask(task.habiticaId, payload);
    return { habiticaId: task.habiticaId, habiticaType: type, created: false };
  }

  const created = await client.createTask(payload);
  return { habiticaId: created.id, habiticaType: created.type, created: true };
}

/** Completing a task in Habitica = scoring "up" on the synced task. */
export async function completeTaskInHabitica(
  client: HabiticaClient,
  habiticaId: string,
): Promise<void> {
  await client.completeTask(habiticaId);
}
