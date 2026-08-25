"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { createHabitAction, deleteHabitAction, updateHabitAction } from "@/lib/actions";
import { fieldErrorsFromZod, habitSchema } from "@/lib/validation";
import { DIFFICULTIES, DIFFICULTY_META } from "@/lib/task-utils";
import { DifficultySelect } from "@/components/ui/difficulty-select";
import type { Habit } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function EditHabitDialog({
  habit,
  open,
  onOpenChange,
  onMove,
  canMoveUp = false,
  canMoveDown = false,
}: {
  habit: Habit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMove?: (direction: "up" | "down") => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  const isCreate = habit == null;
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<string>(habit?.difficulty ?? "easy");
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (!next) {
      setError(null);
      setFieldErrors({});
      setConfirmOpen(false);
      setDifficulty(habit?.difficulty ?? "easy");
    }
    onOpenChange(next);
  }

  function handleSubmit(formData: FormData) {
    const parsed = habitSchema.safeParse({
      title: formData.get("title"),
      notes: formData.get("notes") || undefined,
      difficulty: formData.get("difficulty") || "easy",
    });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }
    setFieldErrors({});
    setError(null);
    startTransition(async () => {
      const result = habit
        ? await updateHabitAction(habit.id, formData)
        : await createHabitAction(formData);
      if (result.ok) handleOpenChange(false);
      else setError(result.error ?? "Something went wrong");
    });
  }

  function handleDelete() {
    if (!habit) return;
    startTransition(async () => {
      await deleteHabitAction(habit.id);
      setConfirmOpen(false);
      handleOpenChange(false);
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isCreate ? "New habit" : "Edit habit"}</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="habit-title">Title</Label>
              <Input
                id="habit-title"
                name="title"
                defaultValue={habit?.title ?? ""}
                required
                aria-invalid={Boolean(fieldErrors.title)}
                aria-describedby={fieldErrors.title ? "habit-title-error" : undefined}
              />
              {fieldErrors.title ? (
                <p id="habit-title-error" className="text-sm text-destructive" role="alert">
                  {fieldErrors.title}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="habit-notes">Notes</Label>
              <Textarea
                id="habit-notes"
                name="notes"
                defaultValue={habit?.notes ?? ""}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <DifficultySelect
                value={difficulty}
                onChange={setDifficulty}
                name="difficulty"
                id="habit-difficulty"
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {habit ? (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setConfirmOpen(true)}
                      disabled={isPending}
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.7} />
                      Delete
                    </Button>
                  ) : null}
                  {habit && onMove ? (
                    <>
                      <Button type="button" variant="outline" disabled={!canMoveUp} onClick={() => onMove("up")}>
                        Move up
                      </Button>
                      <Button type="button" variant="outline" disabled={!canMoveDown} onClick={() => onMove("down")}>
                        Move down
                      </Button>
                    </>
                  ) : null}
                </div>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving…" : isCreate ? "Add habit" : "Save changes"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {habit ? (
        <ConfirmDeleteDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          onConfirm={handleDelete}
          title="Delete habit?"
          description={`"${habit.title}" will be permanently deleted. This cannot be undone.`}
        />
      ) : null}
    </>
  );
}
