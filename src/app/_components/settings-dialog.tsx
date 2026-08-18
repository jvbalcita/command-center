"use client";

import { useRef, useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Refresh01Icon, Settings01Icon } from "@hugeicons/core-free-icons";
import {
  saveHabiticaSettingsAction,
  syncNowAction,
  testHabiticaConnectionAction,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function SettingsDialog({
  initialUserId,
  initialApiToken,
}: {
  initialUserId: string;
  initialApiToken: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function validate(userId: string, apiToken: string) {
    const errs: Record<string, string> = {};
    if (!userId.trim()) errs.userId = "User ID is required.";
    if (!apiToken.trim() && !initialApiToken) errs.apiToken = "API Token is required.";
    return errs;
  }

  function handleSave(formData: FormData) {
    const userId = String(formData.get("userId") ?? "");
    const apiToken = String(formData.get("apiToken") ?? "");
    const errs = validate(userId, apiToken);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setStatus(null);
    startTransition(async () => {
      const result = await saveHabiticaSettingsAction(formData);
      if (result.ok) {
        setStatus({ ok: true, message: "Settings saved." });
      } else if (result.error?.includes("API Token")) {
        setFieldErrors({ apiToken: result.error });
      } else if (result.error?.includes("User ID")) {
        setFieldErrors({ userId: result.error });
      } else {
        setStatus({ ok: false, message: result.error ?? "Failed to save." });
      }
    });
  }

  function handleTest() {
    const fd = new FormData(formRef.current ?? undefined);
    const userId = String(fd.get("userId") ?? "");
    const apiToken = String(fd.get("apiToken") ?? "");
    const errs = validate(userId, apiToken);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setStatus(null);
    startTransition(async () => {
      const r = await testHabiticaConnectionAction(fd);
      setStatus({ ok: r.ok, message: r.message });
    });
  }

  function handleSync() {
    setStatus(null);
    startTransition(async () => {
      const r = await syncNowAction();
      setStatus({ ok: r.ok, message: r.message });
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Settings"
            className="text-muted-foreground hover:text-foreground"
          />
        }
      >
        <HugeiconsIcon icon={Settings01Icon} size={18} strokeWidth={1.8} />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your integrations and connections.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <h3 className="font-heading text-sm font-semibold">Habitica</h3>
          <p className="text-xs text-muted-foreground">
            Sync your tasks with Habitica for gamification. Test before saving.
          </p>
        </div>

        <form ref={formRef} action={handleSave} noValidate className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              name="userId"
              defaultValue={initialUserId}
              placeholder="Find it under Settings → API in Habitica"
              autoComplete="off"
              aria-invalid={fieldErrors.userId ? true : undefined}
            />
            {fieldErrors.userId ? (
              <p className="text-xs text-red-600">{fieldErrors.userId}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apiToken">API Token</Label>
            <Input
              id="apiToken"
              name="apiToken"
              type="password"
              defaultValue={initialApiToken}
              placeholder="API Token"
              autoComplete="off"
              aria-invalid={fieldErrors.apiToken ? true : undefined}
            />
            {fieldErrors.apiToken ? (
              <p className="text-xs text-red-600">{fieldErrors.apiToken}</p>
            ) : null}
          </div>

          {status ? (
            <p className={`text-sm ${status.ok ? "text-primary" : "text-red-600"}`}>
              {status.message}
            </p>
          ) : null}

          <DialogFooter className="sm:justify-start">
            <Button type="submit" disabled={isPending}>
              Save
            </Button>
            <Button type="button" variant="outline" onClick={handleTest} disabled={isPending}>
              Test connection
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSync}
              disabled={isPending}
            >
              <HugeiconsIcon icon={Refresh01Icon} size={15} strokeWidth={1.8} />
              Sync now
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
