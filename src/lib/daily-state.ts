/** Pure daily completion / schedule rules. No I/O. */

export function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function parseRepeatDays(raw: string | null | undefined): number[] | null {
  return parseNumberList(raw);
}

export function parseNumberList(raw: string | number[] | null | undefined): number[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    const nums = raw.filter((d): d is number => typeof d === "number" && Number.isFinite(d));
    return nums.length > 0 ? nums : null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const nums = parsed.filter((d): d is number => typeof d === "number" && Number.isFinite(d));
    return nums.length > 0 ? nums : null;
  } catch {
    return null;
  }
}

export function isCompletedToday(
  daily: { completedToday: boolean; lastCompletedAt: Date | null },
  now: Date,
): boolean {
  if (!daily.completedToday) return false;
  if (!daily.lastCompletedAt) return true;
  return startOfLocalDay(daily.lastCompletedAt) === startOfLocalDay(now);
}

export function needsRollover(
  daily: { completedToday: boolean; lastCompletedAt: Date | null },
  now: Date,
): boolean {
  if (!daily.completedToday || !daily.lastCompletedAt) return false;
  return startOfLocalDay(daily.lastCompletedAt) !== startOfLocalDay(now);
}

export function nextCompleteDaily(
  daily: {
    completedToday: boolean;
    lastCompletedAt?: Date | null;
    streak: number;
  },
  now: Date,
): { completedToday: true; lastCompletedAt: Date; streak: number } | null {
  if (
    isCompletedToday(
      {
        completedToday: daily.completedToday,
        lastCompletedAt: daily.lastCompletedAt ?? null,
      },
      now,
    )
  ) {
    return null;
  }
  return {
    completedToday: true,
    lastCompletedAt: now,
    streak: daily.streak + 1,
  };
}

export function nextUncompleteDaily(
  daily: {
    completedToday: boolean;
    lastCompletedAt?: Date | null;
    streak: number;
  },
  now: Date,
): { completedToday: false; streak: number } | null {
  if (
    !isCompletedToday(
      {
        completedToday: daily.completedToday,
        lastCompletedAt: daily.lastCompletedAt ?? null,
      },
      now,
    )
  ) {
    return null;
  }
  return {
    completedToday: false,
    streak: Math.max(0, daily.streak - 1),
  };
}

export interface DailySchedule {
  frequency: string;
  repeatDays: string | null;
  startDate: Date | null;
  everyX?: number | null;
  daysOfMonth?: string | number[] | null;
  weeksOfMonth?: string | number[] | null;
}

function interval(everyX?: number | null): number {
  const n = everyX ?? 1;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfLocalDay(b) - startOfLocalDay(a)) / 86_400_000);
}

function monthsBetween(start: Date, date: Date): number {
  return (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
}

function weekOfMonth(date: Date): number {
  return Math.ceil(date.getDate() / 7) - 1;
}

function isLastWeekdayOfMonth(date: Date): boolean {
  const next = new Date(date);
  next.setDate(date.getDate() + 7);
  return next.getMonth() !== date.getMonth();
}

export function isDailyDueOn(daily: DailySchedule, date: Date): boolean {
  if (daily.startDate && startOfLocalDay(daily.startDate) > startOfLocalDay(date)) {
    return false;
  }

  const every = interval(daily.everyX);
  const start = daily.startDate ?? date;

  if (daily.frequency === "daily") {
    const diff = daysBetween(start, date);
    return diff >= 0 && diff % every === 0;
  }

  if (daily.frequency === "weekly") {
    const days = parseRepeatDays(daily.repeatDays);
    if (days && !days.includes(date.getDay())) return false;
    const weeks = Math.floor(daysBetween(start, date) / 7);
    return weeks >= 0 && weeks % every === 0;
  }

  if (daily.frequency === "monthly") {
    const monthDiff = monthsBetween(start, date);
    if (monthDiff < 0 || monthDiff % every !== 0) return false;
    const daysOfMonth = parseNumberList(daily.daysOfMonth);
    const weeks = parseNumberList(daily.weeksOfMonth);
    if (weeks && weeks.length > 0) {
      const weekdayOk = parseRepeatDays(daily.repeatDays);
      if (weekdayOk && !weekdayOk.includes(date.getDay())) return false;
      const index = weekOfMonth(date);
      return weeks.includes(index) || (weeks.includes(4) && isLastWeekdayOfMonth(date));
    }
    if (daysOfMonth && daysOfMonth.length > 0) {
      const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      return daysOfMonth.some((d) => date.getDate() === Math.min(d, last));
    }
    return date.getDate() === start.getDate();
  }

  if (daily.frequency === "yearly") {
    const years = date.getFullYear() - start.getFullYear();
    if (years < 0 || years % every !== 0) return false;
    return date.getMonth() === start.getMonth() && date.getDate() === start.getDate();
  }

  return true;
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const WEEK_OF_MONTH_LABELS = ["1st", "2nd", "3rd", "4th", "Last"] as const;

export function formatFrequency(daily: {
  frequency: string;
  repeatDays: string | null;
  everyX?: number | null;
  startDate?: Date | null;
  daysOfMonth?: string | number[] | null;
  weeksOfMonth?: string | number[] | null;
}): string {
  const every = interval(daily.everyX);
  const unit =
    daily.frequency === "daily"
      ? every === 1
        ? "day"
        : "days"
      : daily.frequency === "weekly"
        ? every === 1
          ? "week"
          : "weeks"
        : daily.frequency === "monthly"
          ? every === 1
            ? "month"
            : "months"
          : every === 1
            ? "year"
            : "years";

  if (daily.frequency === "weekly") {
    const days = parseRepeatDays(daily.repeatDays);
    const dayPart = days && days.length > 0 ? days.map((d) => WEEKDAY_LABELS[d]).join(", ") : "Weekly";
    return every === 1 ? dayPart : `${dayPart} · every ${every} ${unit}`;
  }

  if (daily.frequency === "yearly" && daily.startDate) {
    const when = daily.startDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    return every === 1 ? `Repeats every year on ${when}` : `Repeats every ${every} years on ${when}`;
  }

  if (every === 1) {
    return daily.frequency.charAt(0).toUpperCase() + daily.frequency.slice(1);
  }
  return `Every ${every} ${unit}`;
}

export function mergeDailyPull(
  local: { completedToday: boolean; lastCompletedAt: Date | null; streak: number },
  remote: { completedToday: boolean; lastCompletedAt: Date | null; streak: number },
  now: Date,
): { completedToday: boolean; lastCompletedAt: Date | null; streak: number } {
  if (isCompletedToday(local, now)) {
    return {
      completedToday: true,
      lastCompletedAt: local.lastCompletedAt ?? now,
      streak: Math.max(local.streak, remote.streak),
    };
  }
  if (remote.completedToday) {
    return {
      completedToday: true,
      lastCompletedAt: remote.lastCompletedAt ?? now,
      streak: remote.streak,
    };
  }
  return {
    completedToday: false,
    lastCompletedAt: remote.lastCompletedAt,
    streak: remote.streak,
  };
}
