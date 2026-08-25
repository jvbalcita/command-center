#!/usr/bin/env node
/**
 * Score a Habitica habit by title.
 * Usage: npx tsx scripts/score-habit.ts "Habit Title" [up|down]
 *
 * Reads credentials from the local DB (settings table),
 * finds the habit by title, and scores it via the Habitica API.
 */
import "dotenv/config";
import Database from "better-sqlite3";
import { resolve } from "node:path";

const dbPath = resolve(process.env.DATABASE_URL ?? "./data/mission-control.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

function getSettings(): Record<string, string> {
  const rows = db.prepare("SELECT key, value FROM settings").all() as Array<{ key: string; value: string }>;
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value ?? "";
  }
  return result;
}

function findHabit(title: string): { id: number; habiticaId: string } | null {
  const row = db.prepare("SELECT id, habitica_id FROM habits WHERE title = ?").get(title) as
    | { id: number; habitica_id: string }
    | undefined;
  if (!row || !row.habitica_id) return null;
  return { id: row.id, habiticaId: row.habitica_id };
}

function scoreHabiticaTask(habiticaId: string, direction: "up" | "down", creds: { userId: string; apiToken: string }): void {
  const url = `https://habitica.com/api/v3/tasks/${habiticaId}/score/${direction}`;
  const res = require("node:https") as typeof import("node:https");

  // Use a synchronous approach with XMLHttpRequest-like pattern
  const { execSync } = require("node:child_process") as typeof import("node:child_process");
  const result = execSync(
    `curl -s -X POST "${url}" -H "x-api-user: ${creds.userId}" -H "x-api-key: ${creds.apiToken}" -H "x-client: mission-control-hooks"`,
    { encoding: "utf-8", timeout: 10_000 },
  );
  const json = JSON.parse(result);
  if (!json.success) {
    throw new Error(`Habitica error: ${json.message ?? json.error ?? "unknown"}`);
  }
}

function logActivity(habitId: number, title: string, direction: string, habiticaId: string): void {
  db.prepare(
    `INSERT INTO activity (type, entity_type, entity_id, summary, created_at)
     VALUES ('habit_scored', 'habit', ?, ?, unixepoch() * 1000)`,
  ).run(habitId, JSON.stringify({ habit: title, direction, habiticaId }));
}

// ── Main ──────────────────────────────────────────────────────
const habitTitle = process.argv[2];
const direction = (process.argv[3] ?? "up") as "up" | "down";

if (!habitTitle) {
  console.error("Usage: npx tsx scripts/score-habit.ts <habit-title> [up|down]");
  process.exit(1);
}

const settings = getSettings();
const userId = settings.habiticaUserId;
const apiToken = settings.habiticaApiToken;

if (!userId || !apiToken) {
  console.error("Habitica credentials not configured in settings.");
  process.exit(1);
}

// Decrypt token if encrypted
let resolvedToken = apiToken;
if (apiToken.startsWith("ENC:v1:")) {
  try {
    const { maybeDecrypt } = require("../src/lib/crypto") as typeof import("../src/lib/crypto");
    resolvedToken = maybeDecrypt("habiticaApiToken", apiToken);
  } catch {
    // crypto module may not be available in all contexts; try raw
    resolvedToken = apiToken;
  }
}

const habit = findHabit(habitTitle);
if (!habit) {
  console.error(`Habit not found: "${habitTitle}"`);
  process.exit(1);
}

try {
  scoreHabiticaTask(habit.habiticaId, direction, { userId, apiToken: resolvedToken });
  logActivity(habit.id, habitTitle, direction, habit.habiticaId);
  console.log(`✓ Scored "${habitTitle}" ${direction}`);
} catch (err: any) {
  console.error(`✗ Failed to score "${habitTitle}": ${err.message}`);
  process.exit(1);
} finally {
  db.close();
}
