"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { createProjectAction } from "@/lib/actions";
import { createProjectSchema, fieldErrorsFromZod } from "@/lib/validation";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COLORS = ["#0d9488", "#ea580c", "#2563eb", "#7c3aed", "#db2777", "#16a34a"];

export function NewProjectButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
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
      const result = await createProjectAction(formData);
      if (result.ok) setOpen(false);
      else setError(result.error ?? "Something went wrong");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <SidebarMenuButton tooltip="New project" className="text-sidebar-foreground/70" />
        }
      >
        <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.7} />
        <span>New project</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Ship feature"
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
                    defaultChecked={c === COLORS[0]}
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
              {isPending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
