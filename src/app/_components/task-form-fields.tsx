"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PRIORITIES } from "@/lib/task-utils";
import type { Project } from "@/lib/db/schema";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export interface TaskDefaults {
  title?: string;
  notes?: string;
  priority?: string;
  dueDate?: string;
  projectId?: string | number;
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
  const projectId = defaults?.projectId ?? defaultProjectId ?? "";

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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            name="priority"
            defaultValue={defaults?.priority ?? "medium"}
            className={selectClass}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p} className="capitalize">
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dueDate">Due date</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={defaults?.dueDate}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="projectId">Project</Label>
        <select
          id="projectId"
          name="projectId"
          defaultValue={String(projectId)}
          className={selectClass}
        >
          <option value="">No project (inbox)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
