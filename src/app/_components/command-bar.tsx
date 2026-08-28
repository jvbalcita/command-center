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
        <kbd className="pointer-events-none ml-1 hidden rounded border border-border bg-muted px-1.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Quick add</DialogTitle>
            <DialogDescription>
              Type a title, then optional tokens. Nothing else is a command.
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
              placeholder="Ship login @mission #high due:friday"
              aria-describedby="quick-add-help"
            />
            <div id="quick-add-help" className="grid gap-1 font-mono text-[11px] text-muted-foreground">
              <p><span className="text-foreground">title</span> — required, everything that isn’t a token</p>
              <p><span className="text-foreground">@project</span> — prefix is enough if unique (@mission)</p>
              <p><span className="text-foreground">#high</span> — #high #medium #low or #p1 #p2 #p3</p>
              <p><span className="text-foreground">due:friday</span> — today, tomorrow, weekday, or YYYY-MM-DD</p>
            </div>
            {parsed.title || parsed.projectError || parsed.priority || parsed.dueDate || matchedProject ? (
              <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2">
                <p className="text-[11px] font-medium text-muted-foreground">Will create</p>
                <p className="text-sm text-foreground">{parsed.title || "—"}</p>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {parsed.priority ? (
                    <span className="rounded border border-border bg-background px-1.5 py-0.5">
                      {parsed.priority}
                    </span>
                  ) : null}
                  {parsed.dueDate ? (
                    <span className="rounded border border-border bg-background px-1.5 py-0.5">
                      due {parsed.dueDate}
                    </span>
                  ) : null}
                  {matchedProject ? (
                    <span className="rounded border border-border bg-background px-1.5 py-0.5">
                      {matchedProject.name}
                    </span>
                  ) : null}
                </div>
                {parsed.projectError ? (
                  <p className="text-xs text-destructive" role="alert">
                    No project named “{parsed.projectError}”
                  </p>
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
