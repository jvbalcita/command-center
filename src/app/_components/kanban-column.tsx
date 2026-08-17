"use client";

import { useDroppable } from "@dnd-kit/core";
import { STATUS_META, type Status } from "@/lib/task-utils";
import type { Project, Task } from "@/lib/db/schema";
import { KanbanCard } from "./kanban-card";

export function KanbanColumn({
  status,
  tasks,
  projects,
}: {
  status: Status;
  tasks: Task[];
  projects: Project[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = STATUS_META[status];

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full w-[280px] shrink-0 flex-col rounded-xl border bg-muted/40 transition-colors ${
        isOver ? "border-primary/50 bg-primary/5" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-border px-3.5 py-3">
        <span className={`size-2 rounded-full ${meta.dot}`} />
        <h2 className="text-sm font-semibold">{meta.label}</h2>
        <span className="ml-auto rounded-md bg-background px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} projects={projects} />
        ))}
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
            Drop tasks here
          </div>
        ) : null}
      </div>
    </div>
  );
}
