export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_META: Record<
  Priority,
  { label: string; badge: string; dot: string; rank: number }
> = {
  high: {
    label: "High",
    badge: "border-orange-200 bg-orange-50 text-orange-700",
    dot: "bg-orange-500",
    rank: 3,
  },
  medium: {
    label: "Medium",
    badge: "border-teal-200 bg-teal-50 text-teal-700",
    dot: "bg-teal-500",
    rank: 2,
  },
  low: {
    label: "Low",
    badge: "border-slate-200 bg-slate-50 text-slate-500",
    dot: "bg-slate-400",
    rank: 1,
  },
};

const DAY_MS = 86_400_000;
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDueDate(ms: Date | number | null): {
  label: string;
  tone: "overdue" | "soon" | "muted" | "none";
} {
  if (!ms) return { label: "", tone: "none" };
  const due = new Date(ms);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const diffDays = Math.round((dueStart - todayStart) / DAY_MS);

  if (diffDays < 0) return { label: "Overdue", tone: "overdue" };
  if (diffDays === 0) return { label: "Today", tone: "soon" };
  if (diffDays === 1) return { label: "Tomorrow", tone: "soon" };
  return { label: `${MONTHS_SHORT[due.getMonth()]} ${due.getDate()}`, tone: "muted" };
}

export function toDateInputValue(ms: Date | number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const STATUSES = ["todo", "in_progress", "done"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_META: Record<
  Status,
  { label: string; dot: string; ring: string }
> = {
  todo: { label: "Todo", dot: "bg-slate-400", ring: "text-slate-400" },
  in_progress: {
    label: "In Progress",
    dot: "bg-teal-500",
    ring: "text-teal-500",
  },
  done: { label: "Done", dot: "bg-emerald-500", ring: "text-emerald-500" },
};
