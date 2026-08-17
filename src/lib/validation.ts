import { z } from "zod";

export const prioritySchema = z.enum(["low", "medium", "high"]);

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
  dueDate: z.string().optional(), // "YYYY-MM-DD" or ""
});

export type ActionState = { ok: boolean; error?: string };
