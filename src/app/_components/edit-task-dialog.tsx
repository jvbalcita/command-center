"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { deleteTaskAction, updateTaskAction } from "@/lib/actions";
import { fieldErrorsFromZod, taskSchema } from "@/lib/validation";
import type { Project, Subtask, Task } from "@/lib/db/schema";
import { toDateInputValue } from "@/lib/task-utils";
import { Button } from "@/components/ui/button";
import {
  ConfirmDeleteDialog,
} from "@/components/ui/confirm-delete-dialog";
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
  subtasks,
  open,
  onOpenChange,
}: {
  task: Task;
  projects: Project[];
  subtasks: Subtask[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const updateAction = updateTaskAction.bind(null, task.id);

  function handleSubmit(formData: FormData) {
    const parsed = taskSchema.safeParse({
      title: formData.get("title"),
      notes: formData.get("notes") || undefined,
      priority: formData.get("priority") || "medium",
      dueDate: formData.get("dueDate") || undefined,
    });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }
    setFieldErrors({});
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
      setConfirmOpen(false);
      onOpenChange(false);
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} noValidate className="space-y-4">
            <TaskFormFields
              projects={projects}
              defaults={{
                title: task.title,
                notes: task.notes ?? "",
                priority: task.priority ?? "medium",
                difficulty: task.difficulty ?? "easy",
                dueDate: toDateInputValue(task.dueDate),
                projectId: task.projectId ?? "",
                checklist: subtasks.map((s) => ({
                  title: s.title,
                  completed: s.completed,
                })),
              }}
              fieldErrors={fieldErrors}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <div className="flex w-full items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setConfirmOpen(true)}
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

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDelete}
        title="Delete task?"
        description={`"${task.title}" will be permanently deleted. This cannot be undone.`}
      />
    </>
  );
}
