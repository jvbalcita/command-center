"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Fire02Icon } from "@hugeicons/core-free-icons";
import { formatFrequency, isCompletedToday, isDailyDueOn } from "@/lib/daily-state";
import { routineDragId } from "@/lib/reorder";
import type { Daily } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { EditDailyDialog } from "./edit-daily-dialog";
import { useDragClickGuard } from "@/hooks/use-drag-click-guard";

export function DailyCard({
  daily,
  onToggle,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  daily: Daily;
  onToggle: (id: number, completed: boolean) => void;
  onMove: (id: number, direction: "up" | "down") => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const now = new Date();
  const completed = isCompletedToday(daily, now);
  const due = isDailyDueOn(daily, now);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: routineDragId("daily", daily.id),
    data: { kind: "daily" },
  });
  const { draggingRef } = useDragClickGuard(isDragging);

  function handleClick() {
    if (draggingRef.current) return;
    setEditOpen(true);
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        {...attributes}
        {...listeners}
        onClick={handleClick}
        className={`group cursor-grab select-none rounded-xl border bg-card px-3 py-3 shadow-sm transition-shadow active:cursor-grabbing ${
          isDragging ? "opacity-40" : ""
        } ${completed ? "border-border/80" : "border-border"} ${
          !completed && !due ? "opacity-50" : ""
        }`}
      >
        <div className="flex items-start gap-2">
          <Button
            type="button"
            variant={completed ? "secondary" : "outline"}
            size="icon-sm"
            className={`mt-0.5 shrink-0 ${
              completed
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : ""
            }`}
            aria-pressed={completed}
            aria-label={completed ? `Uncomplete ${daily.title}` : `Complete ${daily.title}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(daily.id, completed);
            }}
          >
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={completed ? 2.2 : 1.6} />
          </Button>
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm font-medium leading-snug ${
                completed ? "text-muted-foreground line-through" : "text-foreground"
              }`}
            >
              {daily.title}
            </p>
            {daily.notes ? (
              <p className="mt-1 truncate text-xs text-muted-foreground">{daily.notes}</p>
            ) : null}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
              <span
                className={`inline-flex items-center gap-1 ${
                  due && !completed
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {formatFrequency(daily)}
              </span>
              {daily.streak > 0 ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <HugeiconsIcon icon={Fire02Icon} size={12} strokeWidth={1.8} />
                  {daily.streak}
                </span>
              ) : null}
              {!completed && !due ? (
                <span className="text-muted-foreground">Not due today</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <EditDailyDialog
        daily={daily}
        open={editOpen}
        onOpenChange={setEditOpen}
        onMove={(direction) => onMove(daily.id, direction)}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
      />
    </>
  );
}
