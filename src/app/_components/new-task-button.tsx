"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { createTaskAction } from "@/lib/actions";
import { fieldErrorsFromZod, taskSchema } from "@/lib/validation";
import type { Project } from "@/lib/db/schema";
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

export function NewTaskButton({
  projects,
  defaultProjectId,
}: {
  projects: Project[];
  defaultProjectId?: number;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

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
      const result = await createTaskAction(formData);
      if (result.ok) setOpen(false);
      else setError(result.error ?? "Something went wrong");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" />}>
        <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={1.8} />
        New task
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} noValidate className="space-y-4">
          <TaskFormFields
            projects={projects}
            defaultProjectId={defaultProjectId}
            fieldErrors={fieldErrors}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding…" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
