"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TRIGGER_TYPES, type AutomationRule } from "@/lib/constants";

function formatDate(ms: number) {
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

interface Props {
  rule: AutomationRule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewAutomationRuleDialog({ rule, open, onOpenChange }: Props) {
  const t = TRIGGER_TYPES.find(x => x.value === rule.triggerType);

  function renderTriggerBadge() {
    if (!t) return <Badge variant="outline">{rule.triggerType}</Badge>;
    
    if (rule.triggerType === "schedule" && rule.triggerConfig) {
      try {
        const { cron } = JSON.parse(rule.triggerConfig);
        return (
          <Badge variant="secondary" className="gap-1">
            <HugeiconsIcon icon={t.icon} size={12} strokeWidth={2} />
            Schedule: {cron}
          </Badge>
        );
      } catch {
        return <Badge variant="secondary"><HugeiconsIcon icon={t.icon} size={12} strokeWidth={2} /> Schedule</Badge>;
      }
    }
    
    return (
      <Badge variant="secondary" className="gap-1">
        <HugeiconsIcon icon={t.icon} size={12} strokeWidth={2} />
        {t.label}
      </Badge>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="pr-8">{rule.name}</DialogTitle>
          <DialogDescription>Rule details</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 py-2">
              <div className="flex items-center gap-2">
                {renderTriggerBadge()}
                <Badge variant={rule.enabled ? "default" : "outline"}>
                  {rule.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <Label className="font-mono text-xs text-muted-foreground">Created</Label>
                  <p className="truncate">{formatDate(rule.createdAt)}</p>
                </div>
                <div className="min-w-0">
                  <Label className="font-mono text-xs text-muted-foreground">Updated</Label>
                  <p className="truncate">{formatDate(rule.updatedAt)}</p>
                </div>
              </div>
              
              {rule.description && (
                <div>
                  <Label className="font-mono text-xs text-muted-foreground">Description</Label>
                  <p className="mt-1">{rule.description}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="font-mono text-xs text-muted-foreground">Condition</Label>
                <div className="relative">
                  <pre className="bg-muted/50 p-4 rounded-md text-xs overflow-x-auto border border-border/50 max-w-full">
                    <code className="language-javascript">{rule.condition || "(none)"}</code>
                  </pre>
                </div>
              </div>
              
              <div className="space-y-2 pb-2">
                <Label className="font-mono text-xs text-muted-foreground">Action</Label>
                <div className="relative">
                  <pre className="bg-muted/50 p-4 rounded-md text-xs overflow-x-auto border border-border/50 max-w-full">
                    <code className="language-javascript">{rule.action}</code>
                  </pre>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
        
        <DialogFooter className="pt-4 border-t mt-4 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <HugeiconsIcon icon={Cancel01Icon} size={15} strokeWidth={2} className="mr-2" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
