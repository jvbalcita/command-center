"use client";

import { useEffect, useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  Flag01Icon,
  Flag02Icon,
  Flag03Icon,
} from "@hugeicons/core-free-icons";
import { PRIORITY_META, formatDueDate, type Priority } from "@/lib/task-utils";
import type { Project, Task } from "@/lib/db/schema";
import { EditTaskDialog } from "./edit-task-dialog";

const PRIORITY_ICON = {
  high: Flag03Icon,
  medium: Flag02Icon,
  low: Flag01Icon,
} as const;

export function KanbanCard({ task, projects }: { task: Task; projects: Project[] }) {
  const [editOpen, setEditOpen] = useState(false);
  const draggingRef = useRef(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  useEffect(() => {
    if (isDragging) {
      draggingRef.current = true;
      return;
    }
    const id = setTimeout(() => {
      draggingRef.current = false;
    }, 120);
    return () => clearTimeout(id);
  }, [isDragging]);

  const due = formatDueDate(task.dueDate);
  const priority = (task.priority ?? "medium") as Priority;
  const meta = PRIORITY_META[priority];
  const PriorityIcon = PRIORITY_ICON[priority];
  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null;

  const style = transform ? { transform: CSS.Transform.toString(transform) } : undefined;

  function handleClick() {
    if (draggingRef.current) return;
    setEditOpen(true);
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={handleClick}
        className={`group cursor-grab select-none rounded-xl border border-border bg-card px-3 py-3 shadow-sm transition-shadow active:cursor-grabbing ${
          isDragging ? "z-10 opacity-60 shadow-lg ring-2 ring-primary/30" : ""
        }`}
      >
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
      <EditTaskDialog
        task={task}
        projects={projects}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
