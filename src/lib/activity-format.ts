/**
 * Format activity summary JSON into human-readable text.
 * Some entries are already plain strings (from server actions);
 * others are raw JSON that need parsing.
 */

interface AutomationRuleSummary {
  rule: string;
  trigger: string;
  result?: string | { success?: boolean; data?: unknown };
}

interface AutomationErrorSummary {
  rule: string;
  error: string;
}

interface HabitScoredSummary {
  habit: string;
  direction: string;
}

interface DailySummary {
  daily: string;
  habiticaId?: string;
}

function tryParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function humanizeTrigger(trigger: string): string {
  switch (trigger) {
    case "schedule": return "on schedule";
    case "task_completed": return "when a task was completed";
    case "task_created": return "when a task was created";
    case "daily_completed": return "when a daily was completed";
    case "habit_scored": return "when a habit was scored";
    case "pull_succeeded": return "after syncing from Habitica";
    default: return `on ${trigger.replace(/_/g, " ")}`;
  }
}

function humanizeRuleResult(result: AutomationRuleSummary["result"]): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object" && "success" in result) {
    return result.success ? "✓ Success" : "✗ Failed";
  }
  return "executed";
}

export function formatActivitySummary(type: string, rawSummary: string): string {
  // Some summaries are already human-readable strings
  if (!rawSummary.startsWith("{")) return rawSummary;

  const parsed = tryParse(rawSummary);
  if (!parsed || typeof parsed !== "object") return rawSummary;

  switch (type) {
    case "automation_rule": {
      const { rule, trigger, result } = parsed as AutomationRuleSummary;
      const triggerText = humanizeTrigger(trigger ?? "");
      const resultText = humanizeRuleResult(result);
      return `🔄 "${rule}" — ${triggerText} → ${resultText}`;
    }

    case "automation_error": {
      const { rule, error } = parsed as AutomationErrorSummary;
      return `⚠️ "${rule}" failed — ${error}`;
    }

    case "habit_scored":
    case "habit_scored_up":
    case "habit_scored_down": {
      const { habit, direction } = parsed as HabitScoredSummary;
      const icon = direction === "up" ? "📈" : "📉";
      const dir = direction === "up" ? "scored up" : "scored down";
      return `${icon} ${dir} "${habit}"`;
    }

    case "daily_completed": {
      const { daily } = parsed as DailySummary;
      return `✅ Completed daily "${daily}"`;
    }

    case "daily_uncompleted": {
      const { daily } = parsed as DailySummary;
      return `↩️ Uncompleted daily "${daily}"`;
    }

    case "subtask_toggled": {
      const { subtask, completed, task } = parsed as { subtask: string; completed: boolean; task: string };
      const icon = completed ? "☑️" : "☐";
      const action = completed ? "Completed" : "Unchecked";
      return `${icon} ${action} subtask "${subtask}" in "${task}"`;
    }

    // These are already human-readable but let's add icons
    case "task_completed":
      return `✅ ${rawSummary}`;
    case "task_created":
      return `📝 ${rawSummary}`;
    case "task_deleted":
      return `🗑️ ${rawSummary}`;
    case "task_moved":
      return `📦 ${rawSummary}`;

    default:
      return rawSummary;
  }
}
