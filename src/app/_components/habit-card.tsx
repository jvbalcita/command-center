"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Remove01Icon } from "@hugeicons/core-free-icons";
import { DIFFICULTY_META, type Difficulty } from "@/lib/task-utils";
import { routineDragId } from "@/lib/reorder";
import type { Habit } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { EditHabitDialog } from "./edit-habit-dialog";
import { useDragClickGuard } from "@/hooks/use-drag-click-guard";

export function HabitCard({
  habit,
  onScore,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  habit: Habit;
  onScore: (id: number, direction: "up" | "down") => void;
  onMove: (id: number, direction: "up" | "down") => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: routineDragId("habit", habit.id),
    data: { kind: "habit" },
  });
  const { draggingRef } = useDragClickGuard(isDragging);

  const difficulty = (habit.difficulty ?? "easy") as Difficulty;
  const diffMeta = DIFFICULTY_META[difficulty];

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
        className={`group cursor-grab select-none rounded-xl border border-border bg-card px-3 py-3 shadow-sm transition-shadow active:cursor-grabbing ${
          isDragging ? "opacity-40" : ""
        }`}
      >
        <div className="flex items-start gap-2">
          <div className="flex w-8 shrink-0 flex-col items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
              aria-label={`Score up ${habit.title}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onScore(habit.id, "up");
              }}
            >
              <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} />
            </Button>
            <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
              +{habit.counterUp}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug break-words text-foreground">{habit.title}</p>
            {habit.notes ? (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{habit.notes}</p>
            ) : null}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className={`size-1.5 rounded-full ${diffMeta.dot}`} />
                {diffMeta.label}
              </span>
            </div>
          </div>
          <div className="flex w-8 shrink-0 flex-col items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              aria-label={`Score down ${habit.title}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onScore(habit.id, "down");
              }}
            >
              <HugeiconsIcon icon={Remove01Icon} size={14} strokeWidth={2} />
            </Button>
            <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
              −{habit.counterDown}
            </span>
          </div>
        </div>
      </div>
      <EditHabitDialog
        habit={habit}
        open={editOpen}
        onOpenChange={setEditOpen}
        onMove={(direction) => onMove(habit.id, direction)}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
      />
    </>
  );
}
