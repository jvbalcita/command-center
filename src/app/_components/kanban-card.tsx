"use client";

import { useState, useTransition } from "react";
import { useDraggable } from "@dnd-kit/core";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  CheckListIcon,
  CheckmarkCircle02Icon,
  Flag01Icon,
  Flag02Icon,
  Flag03Icon,
} from "@hugeicons/core-free-icons";
import { toggleTaskCompleteAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import {
  DIFFICULTY_META,
  PRIORITY_META,
  formatDueDate,
  type Difficulty,
  type Priority,
} from "@/lib/task-utils";
import type { Project, Subtask, Task } from "@/lib/db/schema";
import { EditTaskDialog } from "./edit-task-dialog";
import { useDragClickGuard } from "@/hooks/use-drag-click-guard";

const PRIORITY_ICON = {
  high: Flag03Icon,
  medium: Flag02Icon,
  low: Flag01Icon,
} as const;

export function KanbanCard({
  task,
  projects,
  subtasks,
}: {
  task: Task;
  projects: Project[];
  subtasks: Subtask[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [, startTransition] = useTransition();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });
  const { draggingRef } = useDragClickGuard(isDragging);

  const due = formatDueDate(task.dueDate);
  const priority = (task.priority ?? "medium") as Priority;
  const meta = PRIORITY_META[priority];
  const PriorityIcon = PRIORITY_ICON[priority];
  const difficulty = (task.difficulty ?? "easy") as Difficulty;
  const diffMeta = DIFFICULTY_META[difficulty];
  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null;

  const taskSubtasks = subtasks.filter((s) => s.taskId === task.id);
  const doneCount = taskSubtasks.filter((s) => s.completed).length;

  function handleClick() {
    if (draggingRef.current) return;
    setEditOpen(true);
  }

  return (
    <>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={handleClick}
        className={`group cursor-grab select-none rounded-xl border border-border bg-card px-3 py-3 shadow-sm transition-shadow active:cursor-grabbing ${
          isDragging ? "opacity-40" : ""
        }`}
      >
        <div className="flex items-start gap-2">
          <Button
            type="button"
            variant={task.status === "done" ? "secondary" : "outline"}
            size="icon-sm"
            className={`mt-0.5 shrink-0 ${
              task.status === "done"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : ""
            }`}
            aria-pressed={task.status === "done"}
            aria-label={task.status === "done" ? `Reopen ${task.title}` : `Complete ${task.title}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              startTransition(() => {
                void toggleTaskCompleteAction(task.id);
              });
            }}
          >
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={16}
              strokeWidth={task.status === "done" ? 2.2 : 1.6}
            />
          </Button>
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
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className={`size-1.5 rounded-full ${diffMeta.dot}`} />
            {diffMeta.label}
          </span>
          {due.label ? (
            <span
              className={`inline-flex items-center gap-1 ${
                due.tone === "overdue"
                  ? "text-destructive"
                  : due.tone === "soon"
                    ? "text-primary"
                    : "text-muted-foreground"
              }`}
            >
              <HugeiconsIcon icon={Calendar03Icon} size={13} strokeWidth={1.8} />
              {due.label}
            </span>
          ) : null}
          {taskSubtasks.length > 0 ? (
            <span
              className={`inline-flex items-center gap-1 ${
                doneCount === taskSubtasks.length ? "text-emerald-600" : "text-muted-foreground"
              }`}
            >
              <HugeiconsIcon icon={CheckListIcon} size={13} strokeWidth={1.8} />
              {doneCount}/{taskSubtasks.length}
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
        </div>
      </div>
      <EditTaskDialog
        task={task}
        projects={projects}
        subtasks={taskSubtasks}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
