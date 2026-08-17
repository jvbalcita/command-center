"use client";

import { useTransition } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  Delete02Icon,
  DragDropVerticalIcon,
  Flag01Icon,
  Flag02Icon,
  Flag03Icon,
} from "@hugeicons/core-free-icons";
import { deleteTaskAction } from "@/lib/actions";
import { PRIORITY_META, formatDueDate, type Priority } from "@/lib/task-utils";
import type { Project, Task } from "@/lib/db/schema";
import { EditTaskDialog } from "./edit-task-dialog";

const PRIORITY_ICON = {
  high: Flag03Icon,
  medium: Flag02Icon,
  low: Flag01Icon,
} as const;

export function KanbanCard({ task, projects }: { task: Task; projects: Project[] }) {
  const [isPending, startTransition] = useTransition();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const due = formatDueDate(task.dueDate);
  const priority = (task.priority ?? "medium") as Priority;
  const meta = PRIORITY_META[priority];
  const PriorityIcon = PRIORITY_ICON[priority];
  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null;

  const style = transform ? { transform: CSS.Transform.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`group flex items-start gap-2 rounded-xl border border-border bg-card px-3 py-3 shadow-sm transition-shadow ${
        isDragging ? "z-10 opacity-60 shadow-lg ring-2 ring-primary/30" : ""
      } ${isPending ? "opacity-60" : ""}`}
    >
      <button
        type="button"
        aria-label="Drag to move"
        {...listeners}
        className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground/50 transition-colors hover:text-muted-foreground active:cursor-grabbing"
      >
        <HugeiconsIcon icon={DragDropVerticalIcon} size={16} strokeWidth={1.8} />
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium leading-snug ${
            task.status === "done" ? "text-muted-foreground line-through" : "text-foreground"
          }`}
        >
          {task.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${meta.badge}`}
          >
            <HugeiconsIcon icon={PriorityIcon} size={12} strokeWidth={2} />
            {meta.label}
          </span>
          {due.label ? (
            <span
              className={`inline-flex items-center gap-1 ${
                due.tone === "overdue"
                  ? "text-red-600"
                  : due.tone === "soon"
                    ? "text-primary"
                    : "text-muted-foreground"
              }`}
            >
              <HugeiconsIcon icon={Calendar03Icon} size={13} strokeWidth={1.8} />
              {due.label}
            </span>
          ) : null}
          {project ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="size-1.5 rounded-full" style={{ background: project.color ?? "#0d9488" }} />
              <span className="truncate">{project.name}</span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <EditTaskDialog task={task} projects={projects} />
        <button
          type="button"
          aria-label="Delete task"
          onClick={() => startTransition(() => deleteTaskAction(task.id))}
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
}
