"use client";

import { useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  CheckmarkCircle02Icon,
  CircleIcon,
  Delete02Icon,
  Flag01Icon,
  Flag02Icon,
  Flag03Icon,
} from "@hugeicons/core-free-icons";
import { deleteTaskAction, toggleTaskCompleteAction } from "@/lib/actions";
import { PRIORITY_META, formatDueDate, type Priority } from "@/lib/task-utils";
import type { Project, Task } from "@/lib/db/schema";
import { EditTaskDialog } from "./edit-task-dialog";

const PRIORITY_ICON = {
  high: Flag03Icon,
  medium: Flag02Icon,
  low: Flag01Icon,
} as const;

export function TaskItem({ task, projects }: { task: Task; projects: Project[] }) {
  const [isPending, startTransition] = useTransition();
  const done = task.status === "done";
  const due = formatDueDate(task.dueDate);
  const priority = (task.priority ?? "medium") as Priority;
  const meta = PRIORITY_META[priority];
  const PriorityIcon = PRIORITY_ICON[priority];
  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null;

  return (
    <div
      className={`group flex items-start gap-3 rounded-xl border border-border bg-card px-3.5 py-3 transition-opacity ${
        isPending ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        aria-label={done ? "Reopen task" : "Complete task"}
        onClick={() => startTransition(() => toggleTaskCompleteAction(task.id))}
        className={`mt-0.5 shrink-0 transition-colors ${
          done ? "text-primary" : "text-muted-foreground hover:text-primary"
        }`}
      >
        <HugeiconsIcon
          icon={done ? CheckmarkCircle02Icon : CircleIcon}
          size={22}
          strokeWidth={1.7}
        />
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium ${
            done ? "text-muted-foreground line-through" : "text-foreground"
          }`}
        >
          {task.title}
        </p>
        {task.notes ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{task.notes}</p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${meta.badge}`}
          >
            <HugeiconsIcon icon={PriorityIcon} size={13} strokeWidth={2} />
            {meta.label}
          </span>

          {due.label ? (
            <span
              className={`inline-flex items-center gap-1 text-muted-foreground ${
                due.tone === "overdue"
                  ? "text-red-600"
                  : due.tone === "soon"
                    ? "text-primary"
                    : ""
              }`}
            >
              <HugeiconsIcon icon={Calendar03Icon} size={14} strokeWidth={1.8} />
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
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <HugeiconsIcon icon={Delete02Icon} size={17} strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
}
