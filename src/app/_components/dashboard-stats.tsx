"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Task } from "@/lib/db/schema";

const DAY = 86_400_000;

function startOfToday(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function startOfWeek(): number {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.getFullYear(), now.getMonth(), diff).getTime();
}

export function DashboardStats({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get("filter");

  const todayStart = startOfToday();
  const todayEnd = todayStart + DAY;
  const weekStart = startOfWeek();

  const done = tasks.filter((t) => t.status === "done").length;
  const open = tasks.length - done;
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
  const completedThisWeek = tasks.filter((t) => {
    if (t.status !== "done" || !t.completedAt) return false;
    return new Date(t.completedAt).getTime() >= weekStart;
  }).length;

  const stats = [
    { label: "Open", value: open, filter: "open" },
    { label: "In progress", value: inProgress, filter: "in_progress" },
    { label: "Due today", value: dueToday, filter: "due_today" },
    {
      label: "Overdue",
      value: overdue,
      filter: "overdue",
      alert: overdue > 0,
    },
    {
      label: "Done this week",
      value: completedThisWeek,
      filter: "done_this_week",
    },
  ];

  function handleFilterClick(filter: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (currentFilter === filter) {
      params.delete("filter");
    } else {
      params.set("filter", filter);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-6 pt-6 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((s) => {
        const isActive = currentFilter === s.filter;
        return (
          <button
            key={s.label}
            onClick={() => handleFilterClick(s.filter)}
            className={`rounded-xl border px-4 py-3 text-left transition-all hover:shadow-md ${
              s.alert
                ? "border-destructive/30 bg-destructive/5"
                : isActive
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card"
            }`}
          >
            <div className="text-xs font-medium text-muted-foreground">
              {s.label}
            </div>
            <div
              className={`mt-1 font-heading text-2xl font-semibold tabular-nums ${
                s.alert ? "text-destructive" : isActive ? "text-primary" : ""
              }`}
            >
              {s.value}
            </div>
          </button>
        );
      })}
    </div>
  );
}
