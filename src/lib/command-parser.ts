import { slug } from "@/lib/utils";

export interface ParsedCommand {
  title: string;
  projectId?: number;
  projectError?: string;
  priority?: "low" | "medium" | "high";
  dueDate?: string; // YYYY-MM-DD
}

const WEEKDAYS = [
  "sunday", "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday",
];

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDue(token: string): string | undefined {
  const t = token.trim().toLowerCase();
  const now = new Date();

  if (t === "today") return fmt(now);
  if (t === "tomorrow" || t === "tmr" || t === "tmrw") return fmt(addDays(now, 1));
  if (t === "yesterday") return fmt(addDays(now, -1));

  const dateMatch = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (dateMatch) {
    const [, y, m, d] = dateMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime())) return fmt(date);
  }

  const weekday = WEEKDAYS.indexOf(t);
  if (weekday >= 0) {
    const today = now.getDay();
    let diff = (weekday - today + 7) % 7;
    if (diff === 0) diff = 7; // next week if it's today
    return fmt(addDays(now, diff));
  }

  const inMatch = t.match(/^(?:in\s*)?(\d{1,2})\s*d(?:ays?)?$/);
  if (inMatch) return fmt(addDays(now, Number(inMatch[1])));

  return undefined;
}

function normalizePriority(token: string): "low" | "medium" | "high" | undefined {
  switch (token.toLowerCase()) {
    case "high":
    case "urgent":
    case "p1":
      return "high";
    case "medium":
    case "normal":
    case "p2":
      return "medium";
    case "low":
    case "p3":
      return "low";
    default:
      return undefined;
  }
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s+/g, " ")
    .replace(/[\s,]+$/g, "")
    .replace(/\s+\band\b$/i, "")
    .replace(/[\s,]+$/g, "")
    .trim();
}

export function resolveProject(
  token: string,
  projects: { id: number; name: string }[],
): { projectId?: number; projectError?: string } {
  const needle = slug(token);
  if (!needle) return { projectError: token };

  const exact = projects.filter((p) => slug(p.name) === needle);
  if (exact.length === 1) return { projectId: exact[0].id };
  if (exact.length > 1) return { projectError: token };

  const prefixed = projects.filter((p) => slug(p.name).startsWith(needle));
  if (prefixed.length === 1) return { projectId: prefixed[0].id };
  return { projectError: token };
}

export function parseCommand(
  input: string,
  projects: { id: number; name: string }[],
): ParsedCommand {
  let title = input.trim();

  let dueDate: string | undefined;
  const dueMatch = title.match(/due:(\S+)/i);
  if (dueMatch) {
    dueDate = parseDue(dueMatch[1].replace(/[.,;:]+$/, ""));
    title = title.replace(dueMatch[0], "");
  }

  let priority: "low" | "medium" | "high" | undefined;
  const prioMatch = title.match(/#([a-z0-9]+)/i);
  if (prioMatch) {
    priority = normalizePriority(prioMatch[1]);
    title = title.replace(prioMatch[0], "");
  }

  let projectId: number | undefined;
  let projectError: string | undefined;
  const projMatch = title.match(/@([^\s@]+)/);
  if (projMatch) {
    const raw = projMatch[1].replace(/[.,;:]+$/, "");
    const resolved = resolveProject(raw, projects);
    projectId = resolved.projectId;
    projectError = resolved.projectError;
    title = title.replace(projMatch[0], "");
  }

  return {
    title: cleanTitle(title),
    projectId,
    projectError,
    priority,
    dueDate,
  };
}
