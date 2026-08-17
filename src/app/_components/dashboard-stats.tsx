import type { Task } from "@/lib/db/schema";

const DAY = 86_400_000;

function startOfToday(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export function DashboardStats({ tasks }: { tasks: Task[] }) {
  const todayStart = startOfToday();
  const todayEnd = todayStart + DAY;

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const open = total - done;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const dueToday = tasks.filter((t) => {
    if (!t.dueDate || t.status === "done") return false;
    const d = new Date(t.dueDate).getTime();
    return d >= todayStart && d < todayEnd;
  }).length;
  const overdue = tasks.filter((t) => {
    if (!t.dueDate || t.status === "done") return false;
    return new Date(t.dueDate).getTime() < todayStart;
  }).length;

  const stats = [
    { label: "Total", value: total },
    { label: "Open", value: open },
    { label: "In progress", value: inProgress },
    { label: "Due today", value: dueToday },
    { label: "Overdue", value: overdue, alert: overdue > 0 },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 px-6 pt-6 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="text-xs font-medium text-muted-foreground">{s.label}</div>
          <div
            className={`mt-1 font-heading text-2xl font-semibold tabular-nums ${
              s.alert ? "text-destructive" : ""
            }`}
          >
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}
