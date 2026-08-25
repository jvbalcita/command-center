"use client";

import { useState } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import type { Daily, Habit } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { HabitCard } from "./habit-card";
import { DailyCard } from "./daily-card";
import { EditHabitDialog } from "./edit-habit-dialog";
import { EditDailyDialog } from "./edit-daily-dialog";

export function RoutinesColumn({
  kind,
  title,
  count,
  emptyLabel,
  habitIds,
  dailyIds,
  habits,
  dailies,
  onScoreHabit,
  onToggleDaily,
  onMoveHabit,
  onMoveDaily,
}: {
  kind: "habit" | "daily";
  title: string;
  count: number;
  emptyLabel: string;
  habitIds?: string[];
  dailyIds?: string[];
  habits?: Habit[];
  dailies?: Daily[];
  onScoreHabit?: (id: number, direction: "up" | "down") => void;
  onToggleDaily?: (id: number, completed: boolean) => void;
  onMoveHabit?: (id: number, direction: "up" | "down") => void;
  onMoveDaily?: (id: number, direction: "up" | "down") => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const ids = kind === "habit" ? (habitIds ?? []) : (dailyIds ?? []);

  return (
    <section className="flex h-full min-h-[280px] w-full shrink-0 flex-col rounded-xl border border-border bg-muted/40 md:w-[320px] lg:w-[360px]">
      <div className="flex items-center gap-2 border-b border-border px-3.5 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="rounded-md bg-background px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
          {count}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="ml-auto"
          aria-label={`Add ${kind}`}
          onClick={() => setCreateOpen(true)}
        >
          <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
        </Button>
      </div>

      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
          {kind === "habit"
            ? habits?.map((habit, index) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  onScore={onScoreHabit ?? (() => {})}
                  onMove={onMoveHabit ?? (() => {})}
                  canMoveUp={index > 0}
                  canMoveDown={index < habits.length - 1}
                />
              ))
            : dailies?.map((daily, index) => (
                <DailyCard
                  key={daily.id}
                  daily={daily}
                  onToggle={onToggleDaily ?? (() => {})}
                  onMove={onMoveDaily ?? (() => {})}
                  canMoveUp={index > 0}
                  canMoveDown={index < dailies.length - 1}
                />
              ))}
          {ids.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
              {emptyLabel}
            </div>
          ) : null}
        </div>
      </SortableContext>

      {kind === "habit" ? (
        <EditHabitDialog key={createOpen ? "habit-new" : "habit-idle"} habit={null} open={createOpen} onOpenChange={setCreateOpen} />
      ) : (
        <EditDailyDialog key={createOpen ? "daily-new" : "daily-idle"} daily={null} open={createOpen} onOpenChange={setCreateOpen} />
      )}
    </section>
  );
}
