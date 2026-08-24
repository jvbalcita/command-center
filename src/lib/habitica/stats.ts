import { getSetting, setSetting } from "../db/queries";
import { HabiticaClient } from "./client";
import { getHabiticaClient } from "./client-factory";
import type { CachedHabiticaStats } from "./types";

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
