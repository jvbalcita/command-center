"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PencilEdit01Icon } from "@hugeicons/core-free-icons";
import { updateTaskAction } from "@/lib/actions";
import type { Project, Task } from "@/lib/db/schema";
import { toDateInputValue } from "@/lib/task-utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TaskFormFields } from "./task-form-fields";

export function EditTaskDialog({ task, projects }: { task: Task; projects: Project[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const updateAction = updateTaskAction.bind(null, task.id);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateAction(formData);
      if (result.ok) setOpen(false);
      else setError(result.error ?? "Something went wrong");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        type="button"
        aria-label="Edit task"
        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <HugeiconsIcon icon={PencilEdit01Icon} size={17} strokeWidth={1.7} />
      </DialogTrigger>
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
