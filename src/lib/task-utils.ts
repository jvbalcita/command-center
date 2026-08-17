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

export function formatDueDate(ms: Date | number | null): {
  label: string;
  tone: "overdue" | "soon" | "muted" | "none";
} {
  if (!ms) return { label: "", tone: "none" };
  const due = new Date(ms);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / DAY_MS);

  if (diffDays < 0) return { label: "Overdue", tone: "overdue" };
  if (diffDays === 0) return { label: "Today", tone: "soon" };
  if (diffDays === 1) return { label: "Tomorrow", tone: "soon" };
  return {
    label: due.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    tone: "muted",
  };
}

export function toDateInputValue(ms: Date | number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
