"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { deleteTaskAction, updateTaskAction } from "@/lib/actions";
import type { Project, Task } from "@/lib/db/schema";
import { toDateInputValue } from "@/lib/task-utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskFormFields } from "./task-form-fields";

export function EditTaskDialog({
  task,
  projects,
  open,
  onOpenChange,
}: {
  task: Task;
  projects: Project[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const updateAction = updateTaskAction.bind(null, task.id);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateAction(formData);
      if (result.ok) onOpenChange(false);
      else setError(result.error ?? "Something went wrong");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteTaskAction(task.id);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <TaskFormFields
            projects={projects}
            defaults={{
              title: task.title,
              notes: task.notes ?? "",
              priority: task.priority ?? "medium",
              dueDate: toDateInputValue(task.dueDate),
              projectId: task.projectId ?? "",
            }}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <DialogFooter>
            <div className="flex w-full items-center justify-between gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.7} />
                Delete
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
