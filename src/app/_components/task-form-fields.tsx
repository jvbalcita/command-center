"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon } from "@hugeicons/core-free-icons";
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
import { PRIORITIES, toDateInputValue } from "@/lib/task-utils";
import type { Project } from "@/lib/db/schema";

export interface TaskDefaults {
  title?: string;
  notes?: string;
  priority?: string;
  dueDate?: string; // "YYYY-MM-DD" or ""
  projectId?: string | number;
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
}: {
  projects: Project[];
  defaults?: TaskDefaults;
  defaultProjectId?: number;
}) {
  const [priority, setPriority] = useState<string>(defaults?.priority ?? "medium");
  const [projectId, setProjectId] = useState<string>(
    defaults?.projectId != null
      ? String(defaults.projectId)
      : String(defaultProjectId ?? ""),
  );
  const [date, setDate] = useState<Date | undefined>(parseDate(defaults?.dueDate));

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          placeholder="What needs to get done?"
          defaultValue={defaults?.title}
          required
        />
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
      </div>

      <input type="hidden" name="priority" value={priority} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="dueDate" value={date ? toDateInputValue(date) : ""} />

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
      </div>

      <div className="space-y-1.5">
        <Label>Project</Label>
        <Select value={projectId} onValueChange={(v) => setProjectId(v ?? "")}>
          <SelectTrigger type="button" className="w-full">
            <SelectValue>
              {(value: string | null) => {
                if (!value) return "No project (inbox)";
                const project = projects.find((p) => String(p.id) === value);
                return project ? project.name : value;
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
    </>
  );
}
