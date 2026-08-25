// Mapping helpers between Mission Control's model and Habitica's.
// Used by the sync layer (push in Phase 7, pull in the import step).
import type { NewDaily, NewHabit, Subtask } from "@/lib/db/schema";
import type {
  HabiticaChecklistItem,
  HabiticaPriority,
  HabiticaRepeat,
  HabiticaTask,
} from "./types";
import {
  DIFFICULTY_META,
  habiticaToDifficulty,
  type Difficulty,
} from "@/lib/task-utils";

const WEEKDAY_KEYS = ["su", "m", "t", "w", "th", "f", "s"] as const;

/** Habitica `{su,m,t,w,th,f,s}` → JSON array of JS weekday indexes (0=Sun). */
export function habiticaRepeatToDays(
  repeat: HabiticaRepeat | null | undefined,
): string | null {
  if (!repeat) return null;
  const days: number[] = [];
  WEEKDAY_KEYS.forEach((key, i) => {
    if (repeat[key]) days.push(i);
  });
  return days.length > 0 ? JSON.stringify(days) : null;
}

/** Mission Control weekday indexes → Habitica `{su,m,t,w,th,f,s}`. */
export function daysToHabiticaRepeat(days: number[] | null | undefined): HabiticaRepeat {
  const set = new Set(days ?? []);
  return {
    su: set.has(0),
    m: set.has(1),
    t: set.has(2),
    w: set.has(3),
    th: set.has(4),
    f: set.has(5),
    s: set.has(6),
  };
}

export function habiticaDailyToFields(daily: HabiticaTask): NewDaily {
  const frequency = daily.frequency ?? "daily";
  const daysOfMonth = Array.isArray(daily.daysOfMonth) && daily.daysOfMonth.length > 0
    ? JSON.stringify(daily.daysOfMonth)
    : null;
  const weeksOfMonth = Array.isArray(daily.weeksOfMonth) && daily.weeksOfMonth.length > 0
    ? JSON.stringify(daily.weeksOfMonth)
    : null;
  return {
    title: daily.text,
    notes: daily.notes ?? null,
    difficulty: habiticaToDifficulty(daily.priority ?? 1),
    habiticaId: daily.id,
    frequency,
    everyX: typeof daily.everyX === "number" && daily.everyX > 0 ? Math.floor(daily.everyX) : 1,
    repeatDays: habiticaRepeatToDays(daily.repeat),
    daysOfMonth,
    weeksOfMonth,
    startDate: daily.startDate ? new Date(daily.startDate) : null,
    streak: daily.streak ?? 0,
    completedToday: daily.completed ?? false,
    lastCompletedAt: daily.completedAt
      ? new Date(daily.completedAt)
      : daily.completed
        ? new Date()
        : null,
  };
}

export function habiticaHabitToFields(habit: HabiticaTask): NewHabit {
  return {
    title: habit.text,
    notes: habit.notes ?? null,
    difficulty: habiticaToDifficulty(habit.priority ?? 1),
    habiticaId: habit.id,
    counterUp: habit.counterUp ?? 0,
    counterDown: habit.counterDown ?? 0,
  };
}

/** Mission Control difficulty → Habitica `priority` value (0.1/1/1.5/2). */
export function difficultyToHabiticaPriority(d: Difficulty): HabiticaPriority {
  return DIFFICULTY_META[d].habiticaValue as HabiticaPriority;
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
