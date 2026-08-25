/**
 * Shared constants and types used across multiple components.
 * Deduplicates TRIGGER_TYPES, COLORS, and AutomationRule interface.
 */

// ── Automation Rule Types ────────────────────────────────────
// Icons are re-exported as values for use in TRIGGER_TYPES
export {
  Clock01Icon,
  CheckIcon,
  Add01Icon,
  CalendarCheckIcon,
  ArrowUp01Icon,
  Link01Icon,
} from "@hugeicons/core-free-icons";

import {
  Clock01Icon,
  CheckIcon,
  Add01Icon,
  CalendarCheckIcon,
  ArrowUp01Icon,
  Link01Icon,
} from "@hugeicons/core-free-icons";

export const TRIGGER_TYPES = [
  { value: "schedule", label: "Schedule (cron)", icon: Clock01Icon },
  { value: "task_completed", label: "Task Completed", icon: CheckIcon },
  { value: "task_created", label: "Task Created", icon: Add01Icon },
  { value: "daily_completed", label: "Daily Completed", icon: CalendarCheckIcon },
  { value: "habit_scored", label: "Habit Scored", icon: ArrowUp01Icon },
  { value: "pull_succeeded", label: "Habitica Pull Succeeded", icon: Link01Icon },
] as const;

export interface AutomationRule {
  id: number;
  name: string;
  description: string | null;
  enabled: boolean;
  triggerType: string;
  triggerConfig: string | null;
  condition: string | null;
  action: string;
  createdAt: number;
  updatedAt: number;
}

// ── Project Colors ───────────────────────────────────────────
export const PROJECT_COLORS = [
  "#0d9488",
  "#ea580c",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#16a34a",
] as const;

// ── Months Short ─────────────────────────────────────────────
export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;
