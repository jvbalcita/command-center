"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, Edit01Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { archiveProjectAction, updateProjectAction } from "@/lib/actions";
import { createProjectSchema, fieldErrorsFromZod } from "@/lib/validation";
import type { Project } from "@/lib/db/schema";
import { SidebarMenuAction } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COLORS = ["#0d9488", "#ea580c", "#2563eb", "#7c3aed", "#db2777", "#16a34a"];

export function ProjectActionsMenu({ project }: { project: Project }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const updateAction = updateProjectAction.bind(null, project.id);

  function handleUpdate(formData: FormData) {
    const parsed = createProjectSchema.safeParse({
      name: formData.get("name"),
      color: formData.get("color") || undefined,
    });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }
    setFieldErrors({});
    setError(null);
    startTransition(async () => {
      const result = await updateAction(formData);
      if (result.ok) setEditOpen(false);
      else setError(result.error ?? "Something went wrong");
    });
  }

  function handleArchive() {
    startTransition(async () => {
      await archiveProjectAction(project.id);
      setConfirmOpen(false);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<SidebarMenuAction showOnHover />}>
          <HugeiconsIcon icon={MoreHorizontalIcon} size={16} strokeWidth={1.7} />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <HugeiconsIcon icon={Edit01Icon} size={15} strokeWidth={1.7} />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
            <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={1.7} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={project.name}
                aria-invalid={fieldErrors.name ? true : undefined}
              />
              {fieldErrors.name ? (
                <p className="text-xs text-red-600">{fieldErrors.name}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <label key={c} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="color"
                      value={c}
                      defaultChecked={c === (project.color ?? COLORS[0])}
                      className="peer sr-only"
                    />
                    <span
                      className="block size-6 rounded-full ring-offset-2 transition peer-checked:ring-2 peer-checked:ring-foreground"
                      style={{ background: c }}
                    />
                  </label>
                ))}
              </div>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{project.name}&rdquo; will be removed. Its tasks move to the
              inbox.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleArchive}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
