"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Download01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TRIGGER_TYPES, type AutomationRule } from "@/lib/constants";

interface Props {
  rule: AutomationRule | null; // null for new
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<AutomationRule>) => Promise<void>;
}

export function EditAutomationRuleDialog({ rule, open, onOpenChange, onSave }: Props) {
  const isCreate = !rule;
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<Partial<AutomationRule> & { triggerConfigCron?: string }>({
    name: "",
    description: "",
    enabled: true,
    triggerType: "schedule",
    triggerConfigCron: "0 * * * *",
    condition: "",
    action: "",
  });

  useEffect(() => {
    if (open) {
      if (rule) {
        setFormData({
          name: rule.name,
          description: rule.description || "",
          enabled: rule.enabled,
          triggerType: rule.triggerType,
          triggerConfigCron: rule.triggerConfig ? (() => { try { return JSON.parse(rule.triggerConfig).cron || ""; } catch { return ""; } })() : "",
          condition: rule.condition || "",
          action: rule.action,
        });
      } else {
        setFormData({
          name: "",
          description: "",
          enabled: true,
          triggerType: "schedule",
          triggerConfigCron: "0 * * * *",
          condition: "",
          action: "",
        });
      }
      setFieldErrors({});
    }
  }, [open, rule]);

  function validate(data: typeof formData) {
    const errs: Record<string, string> = {};
    if (!data.name?.trim()) errs.name = "Name is required";
    if (!data.triggerType) errs.triggerType = "Trigger type is required";
    if (data.triggerType === "schedule" && !data.triggerConfigCron?.trim()) {
      errs.triggerConfigCron = "Cron expression required for schedule triggers";
    }
    if (!data.action?.trim()) errs.action = "Action is required";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(formData);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setSaving(true);

    const payload = {
      ...formData,
      triggerConfig: formData.triggerType === "schedule"
        ? JSON.stringify({ cron: formData.triggerConfigCron })
        : formData.triggerConfig ?? null,
    };
    delete (payload as any).triggerConfigCron;

    try {
      await onSave(payload);
      onOpenChange(false);
    } catch (e) {
      setFieldErrors({ submit: "Failed to save" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Create Rule" : "Edit Rule"}</DialogTitle>
          <DialogDescription>
            Define conditions and actions for automated workflows. 
            Conditions are JS expressions returning boolean. Actions are async JS function bodies.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4 p-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Auto-complete standup daily"
                  aria-invalid={fieldErrors.name ? true : undefined}
                />
                {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="triggerType">Trigger Type *</Label>
                <Select value={formData.triggerType} onValueChange={v => setFormData({ ...formData, triggerType: v } as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <HugeiconsIcon icon={t.icon} size={14} strokeWidth={2} className="mr-2" />
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.triggerType && <p className="text-xs text-destructive">{fieldErrors.triggerType}</p>}
              </div>
            </div>

            {formData.triggerType === "schedule" && (
              <div className="space-y-1.5">
                <Label htmlFor="triggerConfigCron">Cron Expression *</Label>
                <Input
                  id="triggerConfigCron"
                  value={formData.triggerConfigCron || ""}
                  onChange={e => setFormData({ ...formData, triggerConfigCron: e.target.value })}
                  placeholder="e.g., 0 * * * * (hourly), 30 12 * * 1-4 (Mon-Thu 20:30 Manila)"
                  aria-invalid={fieldErrors.triggerConfigCron ? true : undefined}
                />
                {fieldErrors.triggerConfigCron && <p className="text-xs text-destructive">{fieldErrors.triggerConfigCron}</p>}
                <p className="text-xs text-muted-foreground">
                  Standard cron format. Times are in UTC. Manila is UTC+8.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description || ""}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this rule do?"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="condition">Condition (JS expression returning boolean)</Label>
              <Textarea
                id="condition"
                value={formData.condition || ""}
                onChange={e => setFormData({ ...formData, condition: e.target.value })}
                placeholder={formData.triggerType === "task_completed"
                  ? 'isNightShift(ctx.now)'
                  : formData.triggerType === "schedule"
                    ? 'isWorkDay(ctx.now) && getManilaHour(ctx.now) >= 18'
                    : 'true'}
                rows={3}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Available: ctx (now, trigger, db), isWorkDay, isNightShift, isStandupTime, isTeamMeetingTime,
                getManilaHour, eq, and, gte, lte, sql, scoreHabitAction, completeDailyAction
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="action">Action (async JS function body) *</Label>
              <Textarea
                id="action"
                value={formData.action || ""}
                onChange={e => setFormData({ ...formData, action: e.target.value })}
                placeholder={formData.triggerType === "task_completed"
                  ? `const habit = await ctx.db.select().from(habits).where(eq(habits.title, "Deep Work Session 👨🏻‍💻💻")).limit(1);
if (habit.length === 0) return { success: true, message: "Habit not found" };
const result = await scoreHabitAction(habit[0].id, "up");
return { success: true, message: "Scored Deep Work habit", actions: [{ type: "score_habit", target: habit[0].title, direction: "up", result }] };`
                  : `return { success: true, message: "Done" };`}
                rows={8}
                className="font-mono text-xs"
              />
              {fieldErrors.action && <p className="text-xs text-destructive">{fieldErrors.action}</p>}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
              />
              <Label htmlFor="enabled" className="cursor-pointer">Enabled</Label>
            </div>

            {fieldErrors.submit && (
              <p className="text-sm text-destructive">{fieldErrors.submit}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <HugeiconsIcon icon={Cancel01Icon} size={15} strokeWidth={2} className="mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : (
                <>
                  <HugeiconsIcon icon={Download01Icon} size={15} strokeWidth={2} className="mr-2" />
                  {isCreate ? "Create" : "Save"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
