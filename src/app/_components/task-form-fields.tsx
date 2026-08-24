"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Calendar03Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DIFFICULTIES,
  DIFFICULTY_META,
  PRIORITIES,
  toDateInputValue,
} from "@/lib/task-utils";
import { DifficultySelect } from "@/components/ui/difficulty-select";
import type { Project } from "@/lib/db/schema";

export interface ChecklistDraft {
  title: string;
  completed: boolean;
}

export interface TaskDefaults {
  title?: string;
  notes?: string;
  priority?: string;
  difficulty?: string;
  dueDate?: string; // "YYYY-MM-DD" or ""
  projectId?: string | number;
  checklist?: ChecklistDraft[];
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T12:00:00`);
  return isNaN(d.getTime()) ? undefined : d;
}

export function TaskFormFields({
  projects,
  defaults,
  defaultProjectId,
  fieldErrors,
}: {
  projects: Project[];
  defaults?: TaskDefaults;
  defaultProjectId?: number;
  fieldErrors?: Record<string, string>;
}) {
  const [priority, setPriority] = useState<string>(defaults?.priority ?? "medium");
  const [difficulty, setDifficulty] = useState<string>(defaults?.difficulty ?? "easy");
  const [projectId, setProjectId] = useState<string>(
    defaults?.projectId != null
      ? String(defaults.projectId)
      : String(defaultProjectId ?? ""),
  );
  const [date, setDate] = useState<Date | undefined>(parseDate(defaults?.dueDate));
  const [checklist, setChecklist] = useState<ChecklistDraft[]>(defaults?.checklist ?? []);
  const [newItem, setNewItem] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  function addItem() {
    const t = newItem.trim();
    if (!t) return;
    setChecklist((c) => [...c, { title: t, completed: false }]);
    setNewItem("");
  }

  function toggleItem(index: number) {
    setChecklist((c) =>
      c.map((item, i) => (i === index ? { ...item, completed: !item.completed } : item)),
    );
  }

  function removeItem(index: number) {
    setChecklist((c) => c.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  }

  function startEditing(index: number) {
    setEditingIndex(index);
    setEditingValue(checklist[index].title);
  }

  function saveEditing() {
    if (editingIndex === null) return;
    const t = editingValue.trim();
    if (!t) {
      // Empty title — remove the item instead
      removeItem(editingIndex);
      return;
    }
    setChecklist((c) => c.map((item, i) => (i === editingIndex ? { ...item, title: t } : item)));
    setEditingIndex(null);
  }

  function cancelEditing() {
    setEditingIndex(null);
  }

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          placeholder="What needs to get done?"
          defaultValue={defaults?.title}
          aria-invalid={fieldErrors?.title ? true : undefined}
        />
        {fieldErrors?.title ? (
          <p className="text-xs text-destructive">{fieldErrors.title}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Details, context, links…"
          rows={3}
          defaultValue={defaults?.notes}
        />
        {fieldErrors?.notes ? (
          <p className="text-xs text-destructive">{fieldErrors.notes}</p>
        ) : null}
      </div>

      <input type="hidden" name="priority" value={priority} />
      <input type="hidden" name="difficulty" value={difficulty} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="dueDate" value={date ? toDateInputValue(date) : ""} />
      <input type="hidden" name="checklist" value={JSON.stringify(checklist)} />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v ?? "medium")}>
            <SelectTrigger type="button" className="w-full">
              <SelectValue>
                {(value: string | null) =>
                  value ? value.charAt(0).toUpperCase() + value.slice(1) : ""
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <DifficultySelect
            value={difficulty}
            onChange={setDifficulty}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Due date</Label>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between font-normal"
                >
                  <span className={date ? "" : "text-muted-foreground"}>
                    {date
                      ? date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Pick a date"}
                  </span>
                  <HugeiconsIcon
                    icon={Calendar03Icon}
                    size={16}
                    strokeWidth={1.7}
                    className="text-muted-foreground"
                  />
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => setDate(d ?? undefined)}
                autoFocus
              />
              {date ? (
                <div className="border-t border-border p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center text-muted-foreground"
                    onClick={() => setDate(undefined)}
                  >
                    Clear
                  </Button>
                </div>
              ) : null}
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label>Project</Label>
          <Select value={projectId} onValueChange={(v) => setProjectId(v ?? "")}>
            <SelectTrigger type="button" className="w-full">
              <SelectValue>
                {(value: string | null) => {
                  if (!value) return "No project (inbox)";
                  const project = projects.find((p) => String(p.id) === value);
                  return project ? project.name : "No project (inbox)";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No project (inbox)</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Checklist</Label>
        {checklist.length > 0 ? (
          <div className="max-h-64 overflow-y-auto rounded-md">
            <ul className="space-y-1 pr-1">
            {checklist.map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5"
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => toggleItem(i)}
                  className="size-4 shrink-0 accent-teal-600"
                />
                {editingIndex === i ? (
                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={saveEditing}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveEditing();
                      } else if (e.key === "Escape") {
                        cancelEditing();
                      }
                    }}
                    autoFocus
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none ring-1 ring-ring rounded px-1"
                  />
                ) : (
                  <span
                    onDoubleClick={() => startEditing(i)}
                    className={`min-w-0 flex-1 break-words text-sm cursor-text ${
                      item.completed ? "text-muted-foreground line-through" : ""
                    }`}
                  >
                    {item.title}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  aria-label="Remove sub-task"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={1.7} />
                </button>
              </li>
            ))}
          </ul>
          </div>
        ) : null}
        <div className="flex gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
            placeholder="Add a sub-task"
          />
          <Button type="button" variant="outline" size="icon-sm" onClick={addItem} aria-label="Add sub-task">
            <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.7} />
          </Button>
        </div>
      </div>
    </>
  );
}
