import type { HabiticaClient } from "./client";
import type { HabiticaPriority, HabiticaTaskType } from "./types";
import { difficultyToHabiticaPriority, subtasksToChecklist } from "./mapping";
import type { Difficulty } from "../task-utils";

export interface ChecklistDraft {
  title: string;
  completed: boolean;
}

export interface LocalTaskSnapshot {
  id: number;
  title: string;
  notes: string | null;
  difficulty: Difficulty;
  checklist: ChecklistDraft[];
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
 *
 * Difficulty maps to Habitica's `priority` (its difficulty/XP weight), and the
 * checklist maps to Habitica's `checklist` array.
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
    priority: difficultyToHabiticaPriority(task.difficulty) as HabiticaPriority,
    checklist: subtasksToChecklist(task.checklist),
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
