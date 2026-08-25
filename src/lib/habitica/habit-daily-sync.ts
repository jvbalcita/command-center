import type { HabiticaClient } from "./client";

/** Score a habit in Habitica (up or down). */
export async function scoreHabitInHabitica(
  client: HabiticaClient,
  habiticaId: string,
  direction: "up" | "down",
): Promise<void> {
  await client.scoreTask(habiticaId, direction);
}

/** Complete a daily in Habitica (scores "up"). */
export async function completeDailyInHabitica(
  client: HabiticaClient,
  habiticaId: string,
): Promise<void> {
  await client.completeTask(habiticaId);
}

/** Undo a daily in Habitica (scores "down"). */
export async function uncompleteDailyInHabitica(
  client: HabiticaClient,
  habiticaId: string,
): Promise<void> {
  await client.scoreTask(habiticaId, "down");
}
