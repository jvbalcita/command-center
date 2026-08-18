// Mapping helpers between Mission Control's model and Habitica's.
// Used by the sync layer (push in Phase 7, pull in the import step).
import type { Subtask } from "@/lib/db/schema";
import {
  DIFFICULTY_META,
  habiticaToDifficulty,
  type Difficulty,
} from "@/lib/task-utils";

export interface HabiticaChecklistItem {
  text: string;
  completed: boolean;
  id?: string;
}

/** Mission Control difficulty → Habitica `priority` value (0.1/1/1.5/2). */
export function difficultyToHabiticaPriority(d: Difficulty): number {
  return DIFFICULTY_META[d].habiticaValue;
}

/** Habitica `priority` value → Mission Control difficulty. */
export { habiticaToDifficulty as habiticaPriorityToDifficulty };

/** Mission Control subtasks → Habitica `checklist` array. */
export function subtasksToChecklist(
  subtasks: Pick<Subtask, "title" | "completed">[],
): HabiticaChecklistItem[] {
  return subtasks.map((s) => ({ text: s.title, completed: s.completed }));
}

/** Habitica `checklist` array → Mission Control subtask drafts. */
export function checklistToSubtasks(
  checklist: HabiticaChecklistItem[] | undefined,
): { title: string; completed: boolean }[] {
  if (!Array.isArray(checklist)) return [];
  return checklist
    .filter((c) => typeof c?.text === "string" && c.text.trim().length > 0)
    .map((c) => ({ title: c.text.trim(), completed: Boolean(c.completed) }));
}
