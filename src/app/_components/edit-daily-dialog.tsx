"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { createDailyAction, deleteDailyAction, updateDailyAction } from "@/lib/actions";
import { dailySchema, fieldErrorsFromZod } from "@/lib/validation";
import { DIFFICULTIES, DIFFICULTY_META, toDateInputValue } from "@/lib/task-utils";
import { DifficultySelect } from "@/components/ui/difficulty-select";
import { formatFrequency, parseNumberList, parseRepeatDays, WEEKDAY_LABELS, WEEK_OF_MONTH_LABELS } from "@/lib/daily-state";
import type { Daily } from "@/lib/db/schema";
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

const FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;

export function EditDailyDialog({
  daily,
  open,
  onOpenChange,
  onMove,
  canMoveUp = false,
  canMoveDown = false,
}: {
  daily: Daily | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMove?: (direction: "up" | "down") => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  const isCreate = daily == null;
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<string>(daily?.difficulty ?? "easy");
  const [frequency, setFrequency] = useState(daily?.frequency ?? "daily");
  const [everyX, setEveryX] = useState(String(daily?.everyX ?? 1));
  const [startDate, setStartDate] = useState(toDateInputValue(daily?.startDate ?? null));
  const [repeatDays, setRepeatDays] = useState<number[]>(parseRepeatDays(daily?.repeatDays) ?? []);
  const [daysOfMonth, setDaysOfMonth] = useState<number[]>(parseNumberList(daily?.daysOfMonth) ?? []);
  const [weeksOfMonth, setWeeksOfMonth] = useState<number[]>(parseNumberList(daily?.weeksOfMonth) ?? []);
  const [monthlyMode, setMonthlyMode] = useState<"day" | "week">(
    parseNumberList(daily?.weeksOfMonth)?.length ? "week" : "day",
  );
  const [isPending, startTransition] = useTransition();

  function resetFromDaily() {
    setError(null);
    setFieldErrors({});
    setConfirmOpen(false);
    setDifficulty(daily?.difficulty ?? "easy");
    setFrequency(daily?.frequency ?? "daily");
    setEveryX(String(daily?.everyX ?? 1));
    setStartDate(toDateInputValue(daily?.startDate ?? null));
    setRepeatDays(parseRepeatDays(daily?.repeatDays) ?? []);
    setDaysOfMonth(parseNumberList(daily?.daysOfMonth) ?? []);
    setWeeksOfMonth(parseNumberList(daily?.weeksOfMonth) ?? []);
    setMonthlyMode(parseNumberList(daily?.weeksOfMonth)?.length ? "week" : "day");
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetFromDaily();
    onOpenChange(next);
  }

  function toggleValue(list: number[], value: number): number[] {
    return list.includes(value) ? list.filter((d) => d !== value) : [...list, value].sort((a, b) => a - b);
  }

  function handleSubmit(formData: FormData) {
    const parsed = dailySchema.safeParse({
      title: formData.get("title"),
      notes: formData.get("notes") || undefined,
      difficulty,
      frequency,
      everyX,
      startDate: startDate || undefined,
      repeatDays,
      daysOfMonth: monthlyMode === "day" ? daysOfMonth : [],
      weeksOfMonth: monthlyMode === "week" ? weeksOfMonth : [],
    });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }
    setFieldErrors({});
    setError(null);
    startTransition(async () => {
      const result = daily
        ? await updateDailyAction(daily.id, formData)
        : await createDailyAction(formData);
      if (result.ok) handleOpenChange(false);
      else setError(result.error ?? "Something went wrong");
    });
  }

  function handleDelete() {
    if (!daily) return;
    startTransition(async () => {
      await deleteDailyAction(daily.id);
      setConfirmOpen(false);
      handleOpenChange(false);
    });
  }

  const unit =
    frequency === "daily" ? "day" : frequency === "weekly" ? "week" : frequency === "monthly" ? "month" : "year";
  const preview = formatFrequency({
    frequency,
    repeatDays: JSON.stringify(repeatDays),
    everyX: Number(everyX) || 1,
    startDate: startDate ? new Date(`${startDate}T12:00:00`) : null,
    daysOfMonth,
    weeksOfMonth,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isCreate ? "New daily" : "Edit daily"}</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} noValidate className="space-y-4">
            <input type="hidden" name="difficulty" value={difficulty} />
            <input type="hidden" name="frequency" value={frequency} />
            <input type="hidden" name="everyX" value={everyX} />
            <input type="hidden" name="startDate" value={startDate} />
            <input type="hidden" name="repeatDays" value={JSON.stringify(repeatDays)} />
            <input type="hidden" name="daysOfMonth" value={JSON.stringify(monthlyMode === "day" ? daysOfMonth : [])} />
            <input type="hidden" name="weeksOfMonth" value={JSON.stringify(monthlyMode === "week" ? weeksOfMonth : [])} />

            <div className="space-y-1.5">
              <Label htmlFor="daily-title">Title</Label>
              <Input
                id="daily-title"
                name="title"
                defaultValue={daily?.title ?? ""}
                required
                aria-invalid={Boolean(fieldErrors.title)}
                aria-describedby={fieldErrors.title ? "daily-title-error" : undefined}
              />
              {fieldErrors.title ? (
                <p id="daily-title-error" className="text-sm text-destructive" role="alert">
                  {fieldErrors.title}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="daily-notes">Notes</Label>
              <Textarea id="daily-notes" name="notes" defaultValue={daily?.notes ?? ""} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
              <DifficultySelect
                value={difficulty}
                onChange={setDifficulty}
                name="difficulty"
                id="daily-difficulty"
              />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="daily-frequency">Frequency</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency((v ?? "daily") as typeof frequency)}>
                  <SelectTrigger id="daily-frequency" type="button" className="w-full">
                    <SelectValue>
                      {(value: string | null) =>
                        value ? value.charAt(0).toUpperCase() + value.slice(1) : ""
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f} value={f} className="capitalize">
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="daily-every">Repeat every</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="daily-every"
                    type="number"
                    min={1}
                    max={365}
                    inputMode="numeric"
                    value={everyX}
                    onChange={(e) => setEveryX(e.target.value)}
                  />
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {unit}{Number(everyX) === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="daily-start">Start date</Label>
                <Input id="daily-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
            </div>
            {frequency === "weekly" || (frequency === "monthly" && monthlyMode === "week") ? (
              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium">Repeat on</legend>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_LABELS.map((label, index) => {
                    const pressed = repeatDays.includes(index);
                    return (
                      <Button
                        key={label}
                        type="button"
                        size="sm"
                        variant={pressed ? "default" : "outline"}
                        aria-pressed={pressed}
                        onClick={() => setRepeatDays((current) => toggleValue(current, index))}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}
            {frequency === "monthly" ? (
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  <Button type="button" size="sm" variant={monthlyMode === "day" ? "default" : "outline"} onClick={() => setMonthlyMode("day")}>
                    Day of month
                  </Button>
                  <Button type="button" size="sm" variant={monthlyMode === "week" ? "default" : "outline"} onClick={() => setMonthlyMode("week")}>
                    Week of month
                  </Button>
                </div>
                {monthlyMode === "day" ? (
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                      const pressed = daysOfMonth.includes(day);
                      return (
                        <Button
                          key={day}
                          type="button"
                          size="icon-xs"
                          variant={pressed ? "default" : "outline"}
                          aria-pressed={pressed}
                          onClick={() => setDaysOfMonth((current) => toggleValue(current, day))}
                        >
                          {day}
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {WEEK_OF_MONTH_LABELS.map((label, index) => {
                      const pressed = weeksOfMonth.includes(index);
                      return (
                        <Button
                          key={label}
                          type="button"
                          size="sm"
                          variant={pressed ? "default" : "outline"}
                          aria-pressed={pressed}
                          onClick={() => setWeeksOfMonth((current) => toggleValue(current, index))}
                        >
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
            {frequency === "yearly" ? (
              <p className="text-xs text-muted-foreground">{preview}</p>
            ) : null}
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {daily ? (
                    <Button type="button" variant="destructive" onClick={() => setConfirmOpen(true)} disabled={isPending}>
                      <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.7} />
                      Delete
                    </Button>
                  ) : null}
                  {daily && onMove ? (
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
                  {isPending ? "Saving…" : isCreate ? "Add daily" : "Save changes"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {daily ? (
        <ConfirmDeleteDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          onConfirm={handleDelete}
          title="Delete daily?"
          description={`"${daily.title}" will be permanently deleted. This cannot be undone.`}
        />
      ) : null}
    </>
  );
}
