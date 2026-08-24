"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon } from "@hugeicons/core-free-icons";
import {
  completeDailyAction,
  importRoutinesAction,
  pullHabiticaAction,
  reorderDailiesAction,
  reorderHabitsAction,
  scoreHabitAction,
  uncompleteDailyAction,
} from "@/lib/actions";
import { moveItem, parseRoutineDragId, routineDragId } from "@/lib/reorder";
import type { Daily, Habit } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { RoutinesColumn } from "./routines-column";

export function RoutinesBoard({
  habits: initialHabits,
  dailies: initialDailies,
}: {
  habits: Habit[];
  dailies: Daily[];
}) {
  const router = useRouter();
  const [habits, setHabits] = useState(initialHabits);
  const [dailies, setDailies] = useState(initialDailies);
  const [habitsSource, setHabitsSource] = useState(initialHabits);
  const [dailiesSource, setDailiesSource] = useState(initialDailies);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    async function pull() {
      const result = await pullHabiticaAction();
      if (!cancelled && result.ok) router.refresh();
    }
    void pull();
    function onVisibility() {
      if (document.visibilityState === "visible") void pull();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  if (initialHabits !== habitsSource) {
    setHabitsSource(initialHabits);
    setHabits(initialHabits);
  }
  if (initialDailies !== dailiesSource) {
    setDailiesSource(initialDailies);
    setDailies(initialDailies);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const habitIds = habits.map((h) => routineDragId("habit", h.id));
  const dailyIds = dailies.map((d) => routineDragId("daily", d.id));

  function handleDragStart(event: DragStartEvent) {
    const parsed = parseRoutineDragId(event.active.id);
    if (!parsed) return;
    if (parsed.kind === "habit") {
      setActiveTitle(habits.find((h) => h.id === parsed.id)?.title ?? null);
    } else {
      setActiveTitle(dailies.find((d) => d.id === parsed.id)?.title ?? null);
    }
  }

  function persistHabits(next: Habit[]) {
    setHabits(next);
    startTransition(() => {
      void reorderHabitsAction(next.map((item) => item.id));
    });
  }

  function persistDailies(next: Daily[]) {
    setDailies(next);
    startTransition(() => {
      void reorderDailiesAction(next.map((item) => item.id));
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTitle(null);
    const { active, over } = event;
    if (!over) return;
    const from = parseRoutineDragId(active.id);
    const to = parseRoutineDragId(over.id);
    if (!from || !to || from.kind !== to.kind || from.id === to.id) return;

    if (from.kind === "habit") {
      persistHabits(moveItem(habits, from.id, to.id));
      return;
    }

    persistDailies(moveItem(dailies, from.id, to.id));
  }

  function handleMoveHabit(id: number, direction: "up" | "down") {
    const index = habits.findIndex((item) => item.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= habits.length) return;
    persistHabits(moveItem(habits, id, habits[target].id));
  }

  function handleMoveDaily(id: number, direction: "up" | "down") {
    const index = dailies.findIndex((item) => item.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= dailies.length) return;
    persistDailies(moveItem(dailies, id, dailies[target].id));
  }

  function handleScore(id: number, direction: "up" | "down") {
    setHabits((prev) =>
      prev.map((habit) =>
        habit.id === id
          ? {
              ...habit,
              counterUp: direction === "up" ? habit.counterUp + 1 : habit.counterUp,
              counterDown: direction === "down" ? habit.counterDown + 1 : habit.counterDown,
            }
          : habit,
      ),
    );
    startTransition(() => {
      void scoreHabitAction(id, direction);
    });
  }

  function handleToggleDaily(id: number, completed: boolean) {
    setDailies((prev) =>
      prev.map((daily) =>
        daily.id === id
          ? {
              ...daily,
              completedToday: !completed,
              lastCompletedAt: completed ? daily.lastCompletedAt : new Date(),
              streak: completed ? Math.max(0, daily.streak - 1) : daily.streak + 1,
            }
          : daily,
      ),
    );
    startTransition(() => {
      void (completed ? uncompleteDailyAction(id) : completeDailyAction(id));
    });
  }

  async function handleImport() {
    setIsImporting(true);
    setImportMessage(null);
    try {
      const result = await importRoutinesAction();
      setImportError(!result.ok);
      setImportMessage(result.message);
      if (result.ok) router.refresh();
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <p className="text-sm text-muted-foreground">
          Score habits and check off dailies. Drag to reorder within a column.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleImport()}
          disabled={isImporting}
        >
          <HugeiconsIcon icon={Download01Icon} size={14} strokeWidth={2} />
          {isImporting ? "Importing…" : "Import from Habitica"}
        </Button>
      </div>
      {importMessage ? (
        <p
          role="status"
          className={`border-b px-4 py-2 text-sm sm:px-6 ${
            importError ? "border-destructive/20 text-destructive" : "text-muted-foreground"
          }`}
        >
          {importMessage}
        </p>
      ) : null}
      <DndContext
        id="routines-board"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-auto p-4 md:flex-row md:overflow-x-auto md:p-6">
          <RoutinesColumn
            kind="habit"
            title="Habits"
            count={habits.length}
            emptyLabel="No habits yet"
            habitIds={habitIds}
            habits={habits}
            onScoreHabit={handleScore}
            onMoveHabit={handleMoveHabit}
          />
          <RoutinesColumn
            kind="daily"
            title="Dailies"
            count={dailies.length}
            emptyLabel="No dailies yet"
            dailyIds={dailyIds}
            dailies={dailies}
            onToggleDaily={handleToggleDaily}
            onMoveDaily={handleMoveDaily}
          />
        </div>
        <DragOverlay>
          {activeTitle ? (
            <div className="w-72 rotate-2 rounded-xl border border-border bg-card px-3 py-3 shadow-xl ring-1 ring-primary/20">
              <p className="text-sm font-medium text-foreground">{activeTitle}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
