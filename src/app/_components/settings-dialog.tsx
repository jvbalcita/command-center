"use client";

import { useState, useTransition } from "react";
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

export function SettingsDialog({ initialUserId }: { initialUserId: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    setStatus(null);
    startTransition(async () => {
      const result = await saveHabiticaSettingsAction(formData);
      setStatus(
        result.ok
          ? { ok: true, message: "Settings saved." }
          : { ok: false, message: result.error ?? "Failed to save." },
      );
    });
  }

  function handleTest() {
    setStatus(null);
    startTransition(async () => {
      const r = await testHabiticaConnectionAction();
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
            Sync your tasks with Habitica for gamification. Save first, then test
            or sync.
          </p>
        </div>

        <form action={handleSave} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              name="userId"
              defaultValue={initialUserId}
              placeholder="Find it under Settings → API in Habitica"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apiToken">API Token</Label>
            <Input
              id="apiToken"
              name="apiToken"
              type="password"
              placeholder="Leave blank to keep the saved token"
              autoComplete="off"
            />
          </div>

          {status ? (
            <p
              className={`text-sm ${
                status.ok ? "text-primary" : "text-red-600"
              }`}
            >
              {status.message}
            </p>
          ) : null}

          <DialogFooter className="sm:justify-start">
            <Button type="submit" disabled={isPending}>
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={isPending}
            >
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
