import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// SQLite has no native timestamp type — store epoch milliseconds.
const now = sql`(unixepoch() * 1000)`;

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"), // hex token, e.g. "#0D9488"
  icon: text("icon"), // HugeIcons icon name
  sortOrder: integer("sort_order").notNull().default(0),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
});

export const tasks = sqliteTable(
  "tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    notes: text("notes"),
    priority: text("priority", { enum: ["low", "medium", "high"] })
      .notNull()
      .default("medium"),
    difficulty: text("difficulty", { enum: ["trivial", "easy", "medium", "hard"] })
      .notNull()
      .default("easy"),
    status: text("status", { enum: ["todo", "in_progress", "done"] })
      .notNull()
      .default("todo"),
    dueDate: integer("due_date", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    // Habitica sync fields (set after first successful sync)
    habiticaId: text("habitica_id"),
    habiticaType: text("habitica_type", { enum: ["habit", "daily", "todo", "reward"] }),
    sortOrder: integer("sort_order").notNull().default(0),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (table) => [
    index("tasks_project_idx").on(table.projectId),
    index("tasks_status_idx").on(table.status),
    uniqueIndex("tasks_habitica_id_idx").on(table.habiticaId),
  ],
);

export const subtasks = sqliteTable(
  "subtasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: integer("task_id")
      .references(() => tasks.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (table) => [index("subtasks_task_idx").on(table.taskId)],
);

export const syncLog = sqliteTable("sync_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "set null" }),
  direction: text("direction", { enum: ["to_habitica", "from_habitica"] }).notNull(),
  action: text("action", { enum: ["create", "update", "complete", "delete"] }).notNull(),
  status: text("status", { enum: ["success", "error"] }).notNull(),
  habiticaId: text("habitica_id"),
  message: text("message"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
});

export const activity = sqliteTable("activity", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  summary: text("summary").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"), // JSON-encoded
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
});

// ── Inferred types ───────────────────────────────────────────
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Subtask = typeof subtasks.$inferSelect;
export type NewSubtask = typeof subtasks.$inferInsert;
export type SyncLogRow = typeof syncLog.$inferSelect;
export type NewSyncLog = typeof syncLog.$inferInsert;
export type ActivityRow = typeof activity.$inferSelect;
export type SettingRow = typeof settings.$inferSelect;
