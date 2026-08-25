#!/usr/bin/env node
/**
 * Score a Habitica habit through Command Center.
 * Usage: npx tsx scripts/score-habit.ts "Habit Title" [up|down]
 *
 * Flow: find habit in local DB → call Habitica API → update local counters → log activity
 * Command Center stays as the source of truth.
 */
import "dotenv/config";
import Database from "better-sqlite3";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const dbPath = resolve(process.env.DATABASE_URL ?? "./data/mission-control.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// ── Helpers ───────────────────────────────────────────────────
function getSetting(key: string): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? "";
}

function decryptIfNeeded(key: string, value: string): string {
  if (!value.startsWith("ENC:v1:")) return value;
  try {
    const cryptoPath = resolve(__dirname, "../src/lib/crypto");
    const { maybeDecrypt } = require(cryptoPath);
    return maybeDecrypt(key, value);
  } catch {
    return value;
  }
}

function findHabit(title: string): { id: number; habiticaId: string; title: string; counterUp: number; counterDown: number } | null {
  const row = db.prepare(
    "SELECT id, habitica_id, title, counter_up, counter_down FROM habits WHERE title = ?"
  ).get(title) as any;
  if (!row?.habitica_id) return null;
  return { id: row.id, habiticaId: row.habitica_id, title: row.title, counterUp: row.counter_up, counterDown: row.counter_down };
}

function callHabitica(habiticaId: string, direction: "up" | "down", token: string, userId: string): any {
  const url = `https://habitica.com/api/v3/tasks/${habiticaId}/score/${direction}`;
  const result = execSync(
    `curl -s -X POST "${url}" -H "x-api-user: ${userId}" -H "x-api-key: ${token}" -H "x-client: mission-control-hooks"`,
    { encoding: "utf-8", timeout: 10_000 },
  );
  const json = JSON.parse(result);
  if (!json.success) throw new Error(`Habitica: ${json.message ?? json.error ?? "unknown"}`);
  return json.data;
}

// ── Main ──────────────────────────────────────────────────────
const habitTitle = process.argv[2];
const direction = (process.argv[3] ?? "up") as "up" | "down";

if (!habitTitle) {
  console.error("Usage: npx tsx scripts/score-habit.ts <habit-title> [up|down]");
  process.exit(1);
}

const userId = decryptIfNeeded("habiticaUserId", getSetting("habiticaUserId"));
const apiToken = decryptIfNeeded("habiticaApiToken", getSetting("habiticaApiToken"));

if (!userId || !apiToken) {
  console.error("Habitica credentials not configured in Command Center settings.");
  process.exit(1);
}

const habit = findHabit(habitTitle);
if (!habit) {
  console.error(`Habit not found in Command Center: "${habitTitle}"`);
  process.exit(1);
}

try {
  // 1. Call Habitica API
  const response = callHabitica(habit.habiticaId, direction, apiToken, userId);

  // 2. Update local counters + sync log + activity (same as scoreHabitAction)
  const newCounterUp = direction === "up" ? habit.counterUp + 1 : habit.counterUp;
  const newCounterDown = direction === "down" ? habit.counterDown + 1 : habit.counterDown;

  db.transaction((tx) => {
    tx.prepare(
      `UPDATE habits SET counter_up = ?, counter_down = ?, last_synced_at = ?, updated_at = ? WHERE id = ?`
    ).run(newCounterUp, newCounterDown, Date.now(), Date.now(), habit.id);

    tx.prepare(
      `INSERT INTO sync_log (direction, action, status, habitica_id, message) VALUES (?, ?, ?, ?, ?)`
    ).run("to_habitica", "update", "success", habit.habiticaId, `Scored habit ${direction}`);

    tx.prepare(
      `INSERT INTO activity (type, entity_type, entity_id, summary) VALUES (?, ?, ?, ?)`
    ).run("habit_scored", "habit", habit.id, JSON.stringify({ habit: habit.title, direction, habiticaId: habit.habiticaId }));
  });

  console.log(`✓ Scored "${habitTitle}" ${direction} (via Command Center)`);
} catch (err: any) {
  console.error(`✗ Failed: ${err.message}`);
  process.exit(1);
} finally {
  db.close();
}
