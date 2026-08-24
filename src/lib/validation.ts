import { z } from "zod";

export const prioritySchema = z.enum(["low", "medium", "high"]);
export const difficultySchema = z.enum(["trivial", "easy", "medium", "hard"]);

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(80),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color")
    .optional(),
});

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required").max(200),
  notes: z.string().trim().max(2000).optional(),
  priority: prioritySchema.default("medium"),
  difficulty: difficultySchema.default("easy"),
  dueDate: z.string().optional(), // "YYYY-MM-DD" or ""
});

export const habitSchema = z.object({
  title: z.string().trim().min(1, "Habit title is required").max(200),
  notes: z.string().trim().max(2000).optional(),
  difficulty: difficultySchema.default("easy"),
});

export const dailyFrequencySchema = z.enum(["daily", "weekly", "monthly", "yearly"]);

export const dailySchema = z.object({
  title: z.string().trim().min(1, "Daily title is required").max(200),
  notes: z.string().trim().max(2000).optional(),
  difficulty: difficultySchema.default("easy"),
  frequency: dailyFrequencySchema.default("daily"),
  everyX: z.coerce.number().int().min(1).max(365).default(1),
  startDate: z.string().optional(),
  repeatDays: z
    .array(z.number().int().min(0).max(6))
    .max(7)
    .optional(),
  daysOfMonth: z.array(z.number().int().min(1).max(31)).max(31).optional(),
  weeksOfMonth: z.array(z.number().int().min(0).max(4)).max(5).optional(),
});

export const subtaskSchema = z.object({
  title: z.string().trim().min(1, "Subtask is required").max(200),
});

export type ActionState = { ok: boolean; error?: string };

export function fieldErrorsFromZod(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0]?.toString() ?? "";
    if (key && !(key in out)) out[key] = issue.message;
  }
  return out;
}
