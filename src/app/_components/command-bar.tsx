"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { createTaskAction } from "@/lib/actions";
import { parseCommand } from "@/lib/command-parser";
import type { Project } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CommandBar({ projects }: { projects: Project[] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  const parsed = useMemo(() => parseCommand(title, projects), [title, projects]);
  const matchedProject = parsed.projectId != null
    ? projects.find((p) => p.id === parsed.projectId)
    : null;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  function submit() {
    if (!parsed.title || isPending) return;
    const fd = new FormData();
    fd.set("title", parsed.title);
    if (parsed.projectId != null) fd.set("projectId", String(parsed.projectId));
    if (parsed.priority) fd.set("priority", parsed.priority);
    if (parsed.dueDate) fd.set("dueDate", parsed.dueDate);
    startTransition(async () => {
      await createTaskAction(fd);
      setTitle("");
      setOpen(false);
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden gap-2 text-muted-foreground sm:flex"
        onClick={() => setOpen(true)}
      >
        <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={1.7} />
        <span>Quick add</span>
        <kbd className="pointer-events-none ml-1 hidden rounded border border-border bg-muted px-1.5 font-mono text-[10px] lg:inline">
          ⌘K
        </kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quick add</DialogTitle>
            <DialogDescription>
              Use <code>@project</code>, <code>#priority</code>, and{" "}
              <code>due:tomorrow</code>.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-3"
          >
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ship login @Personal #high due:friday"
            />
            {parsed.title &&
            (matchedProject || parsed.priority || parsed.dueDate) ? (
              <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                {parsed.priority ? (
                  <span className="rounded border border-border bg-muted px-1.5 py-0.5">
                    {parsed.priority}
                  </span>
                ) : null}
                {parsed.dueDate ? (
                  <span className="rounded border border-border bg-muted px-1.5 py-0.5">
                    {parsed.dueDate}
                  </span>
                ) : null}
                {matchedProject ? (
                  <span className="rounded border border-border bg-muted px-1.5 py-0.5">
                    {matchedProject.name}
                  </span>
                ) : null}
              </div>
            ) : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending || !parsed.title}>
                {isPending ? "Adding…" : "Add task"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
