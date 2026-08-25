"use client";

import { DIFFICULTIES, DIFFICULTY_META } from "@/lib/task-utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DifficultySelect({
  value,
  onChange,
  name,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  id?: string;
}) {
  return (
    <div className="space-y-1.5">
      {id ? <Label htmlFor={id}>Difficulty</Label> : <Label>Difficulty</Label>}
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <Select value={value} onValueChange={(v) => onChange(v ?? "easy")}>
        <SelectTrigger id={id} type="button" className="w-full">
          <SelectValue>
            {(v: string | null) =>
              v ? DIFFICULTY_META[v as keyof typeof DIFFICULTY_META]?.label ?? v : ""
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DIFFICULTIES.map((d) => (
            <SelectItem key={d} value={d}>
              {DIFFICULTY_META[d].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
