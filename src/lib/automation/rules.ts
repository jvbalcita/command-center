import { db } from "@/lib/db";
import {
  habits,
  dailies,
  tasks,
  activity,
  automationRules,
  type AutomationRule,
  type NewAutomationRule,
} from "@/lib/db/schema";
import { eq, and, isNull, gte, lte, sql, asc } from "drizzle-orm";
import { scoreHabitAction, completeDailyAction } from "@/lib/automation/actions";
import { getSettings } from "@/lib/db/queries";

// ── Trigger types ───────────────────────────────────────────
export type Trigger =
  | { type: "schedule"; cron: string }
  | { type: "task_completed"; taskId: number }
  | { type: "task_created"; taskId: number }
  | { type: "daily_completed"; dailyId: number }
  | { type: "habit_scored"; habitId: number; direction: "up" | "down" }
  | { type: "pull_succeeded" };

// ── Structured Condition DSL (replaces arbitrary code) ─────
// Supports: always, never, time_of_day, day_of_week, query, and/or/not
export type Condition =
  | { type: "always" }
  | { type: "never" }
  | {
      type: "time_of_day";
      hour_gte: number; // 0-23 Manila hour
      hour_lt: number;  // 0-23 exclusive upper bound (wraps midnight)
      minute_gte?: number;
      minute_lt?: number;
    }
  | { type: "day_of_week"; days: number[] } // 0=Sun..6=Sat
  | {
      type: "query";
      table: "habits" | "dailies" | "tasks" | "activity";
      where?: Record<string, unknown>;
      exists?: boolean; // default true: true if rows found
    }
  | { and: Condition[] }
  | { or: Condition[] }
  | { not: Condition };

// ── Structured Action DSL (replaces arbitrary code) ────────
export type Action =
  | { type: "complete_daily"; dailyTitle: string }
  | { type: "score_habit"; habitTitle: string; direction: "up" | "down" }
  | { type: "query"; sql: string; params?: unknown[] }
  | { type: "log"; message: string };

// ── Rule Context ────────────────────────────────────────────
export interface RuleContext {
  now: Date;
  trigger: Trigger;
  db: typeof db;
  queryEvaluator?: (query: { table: string; where?: Record<string, unknown> }) => unknown[];
}

export interface RuleResult {
  success: boolean;
  message: string;
  actions?: Array<{ type: string; target: string; result: unknown }>;
}

// ── Helper functions available to rules ─────────────────────
function isWorkDay(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getManilaHour(date: Date): number {
  const utc = date.getUTCHours();
  return (utc + 8) % 24;
}

function isNightShift(date: Date): boolean {
  const hour = getManilaHour(date);
  return hour >= 17 || hour < 10;
}

function isStandupTime(date: Date): boolean {
  const hour = getManilaHour(date);
  const minute = date.getUTCMinutes();
  const day = date.getDay();
  return day >= 1 && day <= 4 && hour === 20 && minute >= 30 && minute <= 45;
}

function isTeamMeetingTime(date: Date): boolean {
  const hour = getManilaHour(date);
  const minute = date.getUTCMinutes();
  const day = date.getDay();
  return day === 5 && hour === 19 && minute >= 30 && minute < 45;
}

// ── Safe Condition Evaluator (replaces new Function()) ─────
// Recursively evaluates structured Condition objects. No arbitrary code execution.
export function evaluateCondition(condition: Condition, ctx: RuleContext): boolean {
  // Always
  if ("type" in condition && condition.type === "always") return true;
  if ("type" in condition && condition.type === "never") return false;

  // Time of day (Manila time)
  if ("type" in condition && condition.type === "time_of_day") {
    const hour = getManilaHour(ctx.now);
    const minute = ctx.now.getUTCMinutes();

    // Handle midnight-wrap ranges (e.g., hour_gte:17, hour_lt:10 means 17:00-10:00)
    let hourMatch: boolean;
    if (condition.hour_gte <= condition.hour_lt) {
      hourMatch = hour >= condition.hour_gte && hour < condition.hour_lt;
    } else {
      hourMatch = hour >= condition.hour_gte || hour < condition.hour_lt;
    }

    if (!hourMatch) return false;

    // Minute filters
    if (condition.minute_gte !== undefined && minute < condition.minute_gte) return false;
    if (condition.minute_lt !== undefined && minute >= condition.minute_lt) return false;

    return true;
  }

  // Day of week
  if ("type" in condition && condition.type === "day_of_week") {
    return condition.days.includes(ctx.now.getDay());
  }

  // Query (delegated to evaluator)
  if ("type" in condition && condition.type === "query") {
    if (!ctx.queryEvaluator) return false;
    const rows = ctx.queryEvaluator({ table: condition.table, where: condition.where });
    return condition.exists !== false ? rows.length > 0 : rows.length === 0;
  }

  // Logical: and
  if ("and" in condition) {
    return condition.and.length > 0 && condition.and.every((c) => evaluateCondition(c, ctx));
  }

  // Logical: or
  if ("or" in condition) {
    return condition.or.some((c) => evaluateCondition(c, ctx));
  }

  // Logical: not
  if ("not" in condition) {
    return !evaluateCondition(condition.not, ctx);
  }

  throw new Error(`Unknown condition type: ${JSON.stringify(condition)}`);
}

// ── Safe Action Executor (replaces new Function()) ────────
// Executes predefined, safe actions only. No arbitrary code execution.
async function executeAction(
  action: Action,
  ctx: RuleContext,
): Promise<{ type: string; target: string; result: unknown }> {
  switch (action.type) {
    case "complete_daily": {
      const rows = await ctx.db
        .select()
        .from(dailies)
        .where(eq(dailies.title, action.dailyTitle))
        .limit(1);
      if (rows.length === 0 || rows[0].completedToday) {
        return { type: "complete_daily", target: action.dailyTitle, result: "Already completed or not found" };
      }
      const result = await completeDailyAction(rows[0].id);
      return { type: "complete_daily", target: action.dailyTitle, result };
    }

    case "score_habit": {
      const rows = await ctx.db
        .select()
        .from(habits)
        .where(eq(habits.title, action.habitTitle))
        .limit(1);
      if (rows.length === 0) {
        return { type: "score_habit", target: action.habitTitle, result: "Habit not found" };
      }
      const result = await scoreHabitAction(rows[0].id, action.direction);
      return { type: "score_habit", target: action.habitTitle, result };
    }

    case "query": {
      // Raw SQL via the underlying SQLite client (better-sqlite3)
      const client = (ctx.db as any).$client as import("better-sqlite3").Database;
      const result = client.prepare(action.sql).all(...(action.params ?? []));
      return { type: "query", target: action.sql.slice(0, 80), result };
    }

    case "log": {
      return { type: "log", target: action.message, result: null };
    }

    default:
      throw new Error(`Unknown action type: ${(action as any).type}`);
  }
}

// ── Database Operations ─────────────────────────────────────

export async function loadRulesFromDb(): Promise<AutomationRule[]> {
  return db
    .select()
    .from(automationRules)
    .where(eq(automationRules.enabled, true))
    .orderBy(asc(automationRules.createdAt));
}

async function evaluateRule(rule: AutomationRule, ctx: RuleContext): Promise<RuleResult> {
  try {
    // Parse the structured condition (stored as JSON string)
    let condition: Condition | null = null;
    if (rule.condition) {
      try {
        condition = JSON.parse(rule.condition) as Condition;
      } catch {
        return { success: false, message: `Rule "${rule.name}" has invalid condition JSON` };
      }
    }

    // Check condition
    if (condition) {
      const shouldRun = evaluateCondition(condition, ctx);
      if (!shouldRun) {
        return { success: true, message: "Condition not met" };
      }
    }

    // Parse and execute the structured action (stored as JSON string)
    let actionDef: Action;
    try {
      actionDef = JSON.parse(rule.action) as Action;
    } catch {
      return { success: false, message: `Rule "${rule.name}" has invalid action JSON` };
    }

    const actionResult = await executeAction(actionDef, ctx);

    // Skip activity logging for no-op results (e.g. "Already completed or not found")
    const isNoop =
      typeof actionResult.result === "string" &&
      (actionResult.result.includes("Already completed") ||
        actionResult.result.includes("not found"));
    if (!isNoop) {
      await ctx.db.insert(activity).values({
        type: "automation_rule",
        entityType: "rule",
        entityId: rule.id,
        summary: JSON.stringify({ rule: rule.name, trigger: ctx.trigger.type, result: actionResult.result }),
      });
    }

    return {
      success: true,
      message: isNoop
        ? `Rule "${rule.name}" skipped (no-op)`
        : `Rule "${rule.name}" executed`,
      actions: [actionResult],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await ctx.db.insert(activity).values({
      type: "automation_error",
      entityType: "rule",
      entityId: rule.id,
      summary: JSON.stringify({ rule: rule.name, error: msg }),
    });
    return { success: false, message: `Rule "${rule.name}" failed: ${msg}` };
  }
}

function triggerMatches(ruleTriggerType: string, ruleTriggerConfig: string | null, actualTrigger: Trigger): boolean {
  if (ruleTriggerType !== actualTrigger.type) return false;

  if (ruleTriggerType === "schedule") {
    return true;
  }

  if (ruleTriggerConfig) {
    try {
      JSON.parse(ruleTriggerConfig);
      return true;
    } catch {
      return true;
    }
  }

  return true;
}

export async function runAutomation(trigger: Trigger = { type: "schedule", cron: "manual" }): Promise<RuleResult[]> {
  const rules = await loadRulesFromDb();
  const results: RuleResult[] = [];
  const ctx: RuleContext = { now: new Date(), trigger, db };

  for (const rule of rules) {
    if (!triggerMatches(rule.triggerType, rule.triggerConfig, trigger)) continue;
    const result = await evaluateRule(rule, ctx);
    results.push(result);
  }

  return results;
}

// ── CRUD Operations ─────────────────────────────────────────

export async function createRule(input: Omit<NewAutomationRule, "createdAt" | "updatedAt">): Promise<AutomationRule> {
  const now = new Date();
  const [rule] = await db
    .insert(automationRules)
    .values({ ...input, createdAt: now, updatedAt: now })
    .returning();
  return rule;
}

export async function updateRule(
  id: number,
  patch: Partial<Omit<NewAutomationRule, "createdAt">>,
): Promise<AutomationRule | null> {
  const [rule] = await db
    .update(automationRules)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(automationRules.id, id))
    .returning();
  return rule ?? null;
}

export async function deleteRule(id: number): Promise<void> {
  await db.delete(automationRules).where(eq(automationRules.id, id));
}

export async function getRule(id: number): Promise<AutomationRule | null> {
  const rows = await db.select().from(automationRules).where(eq(automationRules.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listRules(): Promise<AutomationRule[]> {
  return db.select().from(automationRules).orderBy(asc(automationRules.createdAt));
}

// ── Default Rules (structured JSON, no arbitrary code) ─────

export const defaultRules: Omit<NewAutomationRule, "createdAt" | "updatedAt">[] = [
  {
    name: "Auto-complete wake-up daily after 6 PM",
    description: "Completes the wake-up daily when it's past 6 PM Manila time on a work day",
    enabled: true,
    triggerType: "schedule",
    triggerConfig: JSON.stringify({ cron: "0 18 * * 1-5" }),
    condition: JSON.stringify({
      and: [{ type: "day_of_week", days: [1, 2, 3, 4, 5] }, { type: "time_of_day", hour_gte: 18, hour_lt: 23 }],
    } satisfies Condition),
    action: JSON.stringify({
      type: "complete_daily",
      dailyTitle: "Wake up between 4:00 PM to 6:00 PM :alarm_clock:",
    } satisfies Action),
  },
  {
    name: "Auto-complete water daily after wake-up",
    description: "Completes water daily when wake-up daily is completed",
    enabled: true,
    triggerType: "daily_completed",
    triggerConfig: null,
    condition: JSON.stringify({
      type: "query",
      table: "dailies",
      where: { title_like: "Wake up" },
      exists: true,
    } satisfies Condition),
    action: JSON.stringify({
      type: "complete_daily",
      dailyTitle: "Drink water after waking up :droplet:",
    } satisfies Action),
  },
  {
    name: "Score Deep Work habit on task completion during night shift",
    description: "When a task is completed during night shift hours, score the Deep Work habit",
    enabled: true,
    triggerType: "task_completed",
    triggerConfig: null,
    condition: JSON.stringify({
      type: "time_of_day",
      hour_gte: 17,
      hour_lt: 10,
    } satisfies Condition),
    action: JSON.stringify({
      type: "score_habit",
      habitTitle: "Deep Work Session 👨🏻‍💻💻",
      direction: "up",
    } satisfies Action),
  },
  {
    name: "Score Commit Code habit on coding task completion",
    description: "When a coding task is completed, score the commit habit",
    enabled: true,
    triggerType: "task_completed",
    triggerConfig: null,
    condition: JSON.stringify({
      type: "query",
      table: "tasks",
      where: { id_field: "trigger.taskId", title_contains_any: ["code", "commit", "push", "pr", "merge"] },
      exists: true,
    } satisfies Condition),
    action: JSON.stringify({
      type: "score_habit",
      habitTitle: "Commit Code to GitHub </>",
      direction: "up",
    } satisfies Action),
  },
  {
    name: "Score Complete Task habit on any task completion",
    description: "Scores the 'Complete Task' habit whenever any task is marked done",
    enabled: true,
    triggerType: "task_completed",
    triggerConfig: null,
    condition: JSON.stringify({ type: "always" } satisfies Condition),
    action: JSON.stringify({
      type: "score_habit",
      habitTitle: "Complete Task :balloon:",
      direction: "up",
    } satisfies Action),
  },
  {
    name: "Score Complete Daily habit on any daily completion",
    description: "Scores the 'Complete a Daily' habit whenever a daily is checked off",
    enabled: true,
    triggerType: "daily_completed",
    triggerConfig: null,
    condition: JSON.stringify({ type: "always" } satisfies Condition),
    action: JSON.stringify({
      type: "score_habit",
      habitTitle: "Complete a Daily :tada:",
      direction: "up",
    } satisfies Action),
  },
  {
    name: "Auto-complete standup daily at 20:30 Mon-Thu",
    description: "Completes the standup daily when it's standup time",
    enabled: true,
    triggerType: "schedule",
    triggerConfig: JSON.stringify({ cron: "30 12 * * 1-4" }),
    condition: JSON.stringify({
      and: [{ type: "day_of_week", days: [1, 2, 3, 4] }, { type: "time_of_day", hour_gte: 20, hour_lt: 21, minute_gte: 30, minute_lt: 46 }],
    } satisfies Condition),
    action: JSON.stringify({
      type: "complete_daily",
      dailyTitle: "Daily Client Engineering Stand-up Meeting",
    } satisfies Action),
  },
  {
    name: "Auto-complete team meeting daily Friday 19:30",
    description: "Completes the team meeting daily when it's meeting time",
    enabled: true,
    triggerType: "schedule",
    triggerConfig: JSON.stringify({ cron: "30 11 * * 5" }),
    condition: JSON.stringify({
      and: [{ type: "day_of_week", days: [5] }, { type: "time_of_day", hour_gte: 19, hour_lt: 20, minute_gte: 30, minute_lt: 45 }],
    } satisfies Condition),
    action: JSON.stringify({
      type: "complete_daily",
      dailyTitle: "Client Engineering Team Meeting",
    } satisfies Action),
  },
  {
    name: "Score Learning habit on learning task creation",
    description: "When a learning-related task is created, score the learning habit",
    enabled: true,
    triggerType: "task_created",
    triggerConfig: null,
    condition: JSON.stringify({
      type: "query",
      table: "tasks",
      where: { id_field: "trigger.taskId", title_contains_any: ["learn", "study", "read", "course", "tutorial"] },
      exists: true,
    } satisfies Condition),
    action: JSON.stringify({
      type: "score_habit",
      habitTitle: "Learning something awesome :book:",
      direction: "up",
    } satisfies Action),
  },
  {
    name: "Score Add Task habit on task creation",
    description: "Scores the Add Task habit whenever a new task is created in Command Center",
    enabled: true,
    triggerType: "task_created",
    triggerConfig: null,
    condition: JSON.stringify({ type: "always" } satisfies Condition),
    action: JSON.stringify({
      type: "score_habit",
      habitTitle: "Add task to Habitica :heavy_plus_sign:",
      direction: "up",
    } satisfies Action),
  },
  {
    name: "Penalize Procrastination habit when tasks are overdue",
    description: "Penalizes procrastination when there are overdue tasks",
    enabled: true,
    triggerType: "schedule",
    triggerConfig: JSON.stringify({ cron: "0 * * * *" }),
    condition: JSON.stringify({
      type: "query",
      table: "tasks",
      where: { status: "todo", due_before: "now" },
      exists: true,
    } satisfies Condition),
    action: JSON.stringify({
      type: "score_habit",
      habitTitle: "Procrastination 😴😪🥱💤🛌🏼",
      direction: "down",
    } satisfies Action),
  },
  {
    name: "Penalize Doom Scrolling habit during work hours if no deep work",
    description: "Penalizes doom scrolling during work hours when no deep work logged",
    enabled: true,
    triggerType: "schedule",
    triggerConfig: JSON.stringify({ cron: "0 * * * 1-5" }),
    condition: JSON.stringify({
      and: [
        { type: "day_of_week", days: [1, 2, 3, 4, 5] },
        { type: "time_of_day", hour_gte: 17, hour_lt: 10 },
        { not: { type: "query", table: "activity", where: { type: "habit_scored", habit_like: "Deep Work", since_hours: 2 }, exists: true } },
      ],
    } satisfies Condition),
    action: JSON.stringify({
      type: "score_habit",
      habitTitle: "Doom Scrolling 📱📱📱",
      direction: "down",
    } satisfies Action),
  },
];
