"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Delete01Icon,
  Edit01Icon,
  EyeIcon,
  ToggleOnIcon,
  ToggleOffIcon,
  FlashIcon,
  CheckListIcon,
  CodeIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EditAutomationRuleDialog } from "./edit-automation-rule-dialog";
import { ViewAutomationRuleDialog } from "./view-automation-rule-dialog";
import { TRIGGER_TYPES, type AutomationRule } from "@/lib/constants";

interface Props {
  projects: { id: number; name: string }[];
}

function TriggerBadge({ type, config }: { type: string; config: string | null }) {
  const t = TRIGGER_TYPES.find(x => x.value === type);
  if (!t) return <Badge variant="outline">{type}</Badge>;
  
  if (type === "schedule" && config) {
    try {
      const { cron } = JSON.parse(config);
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

export function AutomationRulesView({ projects }: Props) {
  const router = useRouter();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);

  async function loadRules() {
    try {
      const res = await fetch("/api/automation/rules");
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRules(); }, []);

  async function handleDelete(id: number) {
    if (!confirm("Delete this rule?")) return;
    try {
      await fetch(`/api/automation/rules/${id}`, { method: "DELETE" });
      loadRules();
    } catch (e) {
      alert("Failed to delete");
    }
  }

  async function handleToggle(id: number, current: boolean) {
    try {
      await fetch(`/api/automation/rules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !current }),
      });
      loadRules();
    } catch (e) {
      alert("Failed to toggle");
    }
  }

  async function handleSave(data: Partial<AutomationRule>) {
    const isCreate = !selectedRule;
    const url = isCreate ? "/api/automation/rules" : `/api/automation/rules/${selectedRule.id}`;
    const method = isCreate ? "POST" : "PUT";
    
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to save");
    }
    
    loadRules();
  }

  function openNew() {
    setSelectedRule(null);
    setEditOpen(true);
  }

  function openEdit(rule: AutomationRule) {
    setSelectedRule(rule);
    setEditOpen(true);
  }

  function openView(rule: AutomationRule) {
    setSelectedRule(rule);
    setViewOpen(true);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Automation Rules</h1>
          <p className="text-sm text-muted-foreground">Event-driven automation for habits, dailies, and tasks</p>
        </div>
        <Button onClick={openNew}>
          <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} className="mr-2" />
          New Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <HugeiconsIcon icon={FlashIcon} size={48} strokeWidth={1.5} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">No automation rules yet</p>
            <p className="text-sm">Click "New Rule" to create your first automation</p>
          </div>
        </Card>
      ) : (
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))" }}>
              {rules.map(rule => (
                <RuleCard 
                  key={rule.id} 
                  rule={rule} 
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                  onView={openView}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <EditAutomationRuleDialog
        rule={selectedRule}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleSave}
      />

      {selectedRule && (
        <ViewAutomationRuleDialog
          rule={selectedRule}
          open={viewOpen}
          onOpenChange={setViewOpen}
        />
      )}
    </div>
  );
}

function RuleCard({
  rule,
  onEdit,
  onDelete,
  onToggle,
  onView,
}: {
  rule: AutomationRule;
  onEdit: (r: AutomationRule) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number, current: boolean) => void;
  onView: (r: AutomationRule) => void;
}) {
  return (
    <Card className="relative group hover:border-primary/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight pr-24">{rule.name}</CardTitle>
          <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(rule)} />}>
                  <HugeiconsIcon icon={EyeIcon} size={14} strokeWidth={2} />
                </TooltipTrigger>
                <TooltipContent>View</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(rule)} />}>
                  <HugeiconsIcon icon={Edit01Icon} size={14} strokeWidth={2} />
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(rule.id)} />}>
                  <HugeiconsIcon icon={Delete01Icon} size={14} strokeWidth={2} />
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <TriggerBadge type={rule.triggerType} config={rule.triggerConfig} />
          <Badge variant={rule.enabled ? "default" : "outline"}>
            {rule.enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground line-clamp-2">
        {rule.description || "No description"}
      </CardContent>
    </Card>
  );
}
