import { getHabiticaClient } from "./client-factory";
import { listHabits, listDailies, updateHabit, updateDaily } from "../db/queries";
import { difficultyToHabiticaPriority, daysToHabiticaRepeat } from "./mapping";
import { parseRepeatDays, parseNumberList } from "../daily-state";
import type { Habit, Daily } from "../db/schema";

/**
 * Create a new habit in Habitica and return its ID.
 */
export async function createHabitInHabitica(
  habit: Omit<Habit, "id" | "habiticaId" | "createdAt" | "updatedAt">
): Promise<string> {
  const client = await getHabiticaClient();
  const result = await client.createTask({
    text: habit.title,
    type: "habit",
    notes: habit.notes ?? undefined,
    priority: difficultyToHabiticaPriority(habit.difficulty),
  });
  return result.id;
}

/**
 * Create a new daily in Habitica and return its ID.
 */
export async function createDailyInHabitica(
  daily: Omit<Daily, "id" | "habiticaId" | "createdAt" | "updatedAt" | "lastSyncedAt">
): Promise<string> {
  const client = await getHabiticaClient();
  const result = await client.createTask({
    text: daily.title,
    type: "daily",
    notes: daily.notes ?? undefined,
    priority: difficultyToHabiticaPriority(daily.difficulty),
    frequency: daily.frequency,
    everyX: daily.everyX ?? 1,
    repeat: daysToHabiticaRepeat(parseRepeatDays(daily.repeatDays)),
    startDate: daily.startDate ? daily.startDate.toISOString() : undefined,
    daysOfMonth: parseNumberList(daily.daysOfMonth) ?? [],
    weeksOfMonth: parseNumberList(daily.weeksOfMonth) ?? [],
  });
  return result.id;
}

/**
 * Push all local habits to Habitica (create or update).
 * Returns counts of created, updated, and failed.
 */
export async function pushAllHabits(): Promise<{
  created: number;
  updated: number;
  failed: number;
}> {
  const habits = await listHabits();
  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const habit of habits) {
    try {
      if (habit.habiticaId) {
        // Update existing
        const client = await getHabiticaClient();
        await client.updateTask(habit.habiticaId, {
          text: habit.title,
          notes: habit.notes ?? "",
          priority: difficultyToHabiticaPriority(habit.difficulty),
        });
        updated++;
      } else {
        // Create new in Habitica
        const habiticaId = await createHabitInHabitica(habit);
        // Save the Habitica ID back to local database
        await updateHabit(habit.id, { habiticaId });
        created++;
      }
    } catch (err) {
      console.error(`[pushAllHabits] FAILED habit "${habit.title}" (id=${habit.id}, habiticaId=${habit.habiticaId}):`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  return { created, updated, failed };
}

/**
 * Push all local dailies to Habitica (create or update).
 * Returns counts of created, updated, and failed.
 */
export async function pushAllDailies(): Promise<{
  created: number;
  updated: number;
  failed: number;
}> {
  const dailies = await listDailies();
  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const daily of dailies) {
    try {
      if (daily.habiticaId) {
        // Update existing
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
        updated++;
      } else {
        // Create new in Habitica
        const habiticaId = await createDailyInHabitica(daily);
        // Save the Habitica ID back to local database
        await updateDaily(daily.id, { habiticaId });
        created++;
      }
    } catch (err) {
      console.error(`[pushAllDailies] FAILED daily "${daily.title}" (id=${daily.id}, habiticaId=${daily.habiticaId}):`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  return { created, updated, failed };
}
