import { getHabiticaClient } from "./client-factory";
import type { Daily, Habit } from "../db/schema";
import { difficultyToHabiticaPriority, daysToHabiticaRepeat } from "./mapping";
import { parseRepeatDays, parseNumberList } from "../daily-state";

export async function pushHabitToHabitica(habit: Habit): Promise<void> {
  if (!habit.habiticaId) return;
  const client = await getHabiticaClient();
  await client.updateTask(habit.habiticaId, {
    text: habit.title,
    notes: habit.notes ?? "",
    priority: difficultyToHabiticaPriority(habit.difficulty),
  });
}

export async function pushDailyToHabitica(daily: Daily): Promise<void> {
  if (!daily.habiticaId) return;
  const client = await getHabiticaClient();
  await client.updateTask(daily.habiticaId, {
    text: daily.title,
    notes: daily.notes ?? "",
    priority: difficultyToHabiticaPriority(daily.difficulty),
    frequency: daily.frequency,
    everyX: daily.everyX ?? 1,
    repeat: daysToHabiticaRepeat(parseRepeatDays(daily.repeatDays)),
    startDate: daily.startDate ? daily.startDate.toISOString() : undefined,
    daysOfMonth: parseNumberList(daily.daysOfMonth) ?? [],
    weeksOfMonth: parseNumberList(daily.weeksOfMonth) ?? [],
  });
}
