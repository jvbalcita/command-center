"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { moveTaskAction } from "@/lib/actions";
import { STATUSES, type Status } from "@/lib/task-utils";
import type { Project, Task } from "@/lib/db/schema";
import { KanbanColumn } from "./kanban-column";

export function KanbanBoard({ tasks, projects }: { tasks: Task[]; projects: Project[] }) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byStatus: Record<Status, Task[]> = { todo: [], in_progress: [], done: [] };
  for (const t of tasks) {
    byStatus[t.status].push(t);
  }

  function handleDragStart(e: DragStartEvent) {
    const id = e.active.id as number;
    setActiveTask(tasks.find((t) => t.id === id) ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveTask(null);
    if (!over) return;

    const taskId = active.id as number;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const target = over.id as Status;
    if (STATUSES.includes(target) && target !== task.status) {
      startTransition(() => {
        moveTaskAction(taskId, target);
      });
    }
  }

  return (
    <DndContext
      id="kanban-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-6">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={byStatus[status]}
            projects={projects}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="w-64 rotate-2 rounded-xl border border-border bg-card px-3 py-3 shadow-xl ring-1 ring-primary/20">
            <p className="text-sm font-medium text-foreground">{activeTask.title}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
