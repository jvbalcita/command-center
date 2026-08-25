import {
  createSubtask as dbCreateSubtask,
  createTask as dbCreateTask,
  createHabit as dbCreateHabit,
  createDaily as dbCreateDaily,
  listTasks,
  listHabits,
  listDailies,
  logSync,
  updateDaily as dbUpdateDaily,
  updateHabit as dbUpdateHabit,
  updateTask as dbUpdateTask,
} from "../db/queries";
import type { Daily } from "../db/schema";
import { HabiticaClient } from "./client";
import {
  checklistToSubtasks,
  habiticaDailyToFields,
  habiticaHabitToFields,
  habiticaPriorityToDifficulty,
} from "./mapping";
import { mergeDailyPull } from "../daily-state";
import { getHabiticaClient } from "./client-factory";

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
}

// ── Generic sync helper ──────────────────────────────────────

interface SyncRemoteCollectionConfig<TRemote, TLocal> {
  /** Extract the Habitica ID from a remote item (used as the sync key). */
  getHabiticaId: (item: TRemote) => string;
  /** Map a remote item to local database fields for create/update. */
  mapFields: (item: TRemote) => Record<string, unknown>;
  /** Create a new local record. Return the new record's id. */
  createLocal: (
    fields: Record<string, unknown>,
    item: TRemote,
  ) => Promise<number>;
  /** Update an existing local record by its id. */
  updateLocal: (
    localId: number,
    fields: Record<string, unknown>,
    item: TRemote,
    existing: TLocal,
  ) => Promise<void>;
  /** Optional: called after a successful create, with the new local id. */
  afterCreate?: (localId: number, item: TRemote) => Promise<void>;
  /** Optional: derive the taskId for logSync on success. Default: () => null. */
  getTaskId?: (localId: number, item: TRemote) => number | null;
}

/**
 * Generic import loop: diff remote items against local by habiticaId,
 * create or update each, and log every operation.
 */
async function syncRemoteCollection<
  TRemote,
  TLocal extends { id: number; habiticaId: string | null },
>(
  remoteItems: TRemote[],
  localItems: TLocal[],
  config: SyncRemoteCollectionConfig<TRemote, TLocal>,
): Promise<ImportResult> {
  const byHabiticaId = new Map(
    localItems
      .filter(
        (t): t is TLocal & { habiticaId: string } => Boolean(t.habiticaId),
      )
      .map((t) => [t.habiticaId, t]),
  );

  let imported = 0;
  let updated = 0;
  let failed = 0;

  for (const item of remoteItems) {
    try {
      const fields = config.mapFields(item);
      const habiticaId = config.getHabiticaId(item);
      const current = byHabiticaId.get(habiticaId);

      let localId: number;
      if (current) {
        localId = current.id;
        await config.updateLocal(localId, fields, item, current);
        updated++;
      } else {
        localId = await config.createLocal(fields, item);
        if (config.afterCreate) {
          await config.afterCreate(localId, item);
        }
        imported++;
      }

      const taskId = config.getTaskId
        ? config.getTaskId(localId, item)
        : null;
      await logSync({
        taskId,
        direction: "from_habitica",
        action: current ? "update" : "create",
        status: "success",
        habiticaId,
      });
    } catch (err) {
      failed++;
      await logSync({
        taskId: null,
        direction: "from_habitica",
        action: "create",
        status: "error",
        habiticaId: config.getHabiticaId(item),
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { imported, updated, skipped: 0, failed };
}

// ── Import Todos (pull Habitica → Mission Control) ────────────

/**
 * Pull Habitica todos into Mission Control. Idempotent: tasks already linked
 * (by `habitica_id`) are skipped, so re-runs never duplicate.
 */
export async function importFromHabitica(
  client?: HabiticaClient,
): Promise<ImportResult> {
  const c = client ?? (await getHabiticaClient());
  const existing = await listTasks({ includeArchived: true });
  const todos = await c.listTasks("todos");

  return syncRemoteCollection(todos, existing, {
    getHabiticaId: (t) => t.id,
    mapFields: (todo) => ({
      title: todo.text,
      notes: todo.notes ?? null,
      difficulty: habiticaPriorityToDifficulty(todo.priority ?? 1),
      dueDate:
        todo.date && !isNaN(Date.parse(todo.date))
          ? new Date(todo.date)
          : null,
    }),
    createLocal: async (fields, todo) => {
      const task = await dbCreateTask({
        ...fields,
        priority: "medium",
        status: "todo",
        habiticaId: todo.id,
        habiticaType: "todo",
      } as Parameters<typeof dbCreateTask>[0]);
      return task.id;
    },
    updateLocal: async (id, fields) => {
      await dbUpdateTask(id, fields);
    },
    afterCreate: async (localId, todo) => {
      const checklist = checklistToSubtasks(todo.checklist);
      for (let i = 0; i < checklist.length; i++) {
        await dbCreateSubtask({
          taskId: localId,
          title: checklist[i].title,
          completed: checklist[i].completed,
          position: i,
        });
      }
    },
    getTaskId: (localId) => localId,
  });
}

// ── Import Habits (pull Habitica → Mission Control) ───────────

export async function importHabits(
  client?: HabiticaClient,
): Promise<ImportResult> {
  const c = client ?? (await getHabiticaClient());
  const existing = await listHabits();
  const remoteHabits = await c.listTasks("habits");

  return syncRemoteCollection(remoteHabits, existing, {
    getHabiticaId: (h) => h.id,
    mapFields: (h) => habiticaHabitToFields(h),
    createLocal: async (fields) => {
      const habit = await dbCreateHabit({
        ...fields,
        lastSyncedAt: new Date(),
      } as Parameters<typeof dbCreateHabit>[0]);
      return habit.id;
    },
    updateLocal: async (id, fields) => {
      await dbUpdateHabit(id, {
        ...fields,
        lastSyncedAt: new Date(),
      } as Parameters<typeof dbUpdateHabit>[1]);
    },
  });
}

// ── Import Dailies (pull Habitica → Mission Control) ──────────

export async function importDailies(
  client?: HabiticaClient,
): Promise<ImportResult> {
  const c = client ?? (await getHabiticaClient());
  const existing = await listDailies();
  const remoteDailies = await c.listTasks("dailys");

  return syncRemoteCollection(remoteDailies, existing, {
    getHabiticaId: (d) => d.id,
    mapFields: (d) => habiticaDailyToFields(d),
    createLocal: async (fields) => {
      const daily = await dbCreateDaily({
        ...fields,
        lastSyncedAt: new Date(),
      } as Parameters<typeof dbCreateDaily>[0]);
      return daily.id;
    },
    updateLocal: async (id, fields, _remote, current) => {
      const daily = current as Daily;
      const completion = mergeDailyPull(
        {
          completedToday: daily.completedToday,
          lastCompletedAt: daily.lastCompletedAt,
          streak: daily.streak,
        },
        {
          completedToday: (fields.completedToday as boolean) ?? false,
          lastCompletedAt: (fields.lastCompletedAt as Date | null) ?? null,
          streak: (fields.streak as number | null) ?? daily.streak,
        },
        new Date(),
      );
      await dbUpdateDaily(id, {
        ...fields,
        ...completion,
        lastSyncedAt: new Date(),
      } as Parameters<typeof dbUpdateDaily>[1]);
    },
  });
}

// ── Aggregate helpers ─────────────────────────────────────────

export async function importRoutines(
  client?: HabiticaClient,
): Promise<{ habits: ImportResult; dailies: ImportResult }> {
  const c = client ?? (await getHabiticaClient());
  const habits = await importHabits(c);
  const dailies = await importDailies(c);
  return { habits, dailies };
}

export async function importAllFromHabitica(
  client?: HabiticaClient,
): Promise<{
  todos: ImportResult;
  habits: ImportResult;
  dailies: ImportResult;
}> {
  const c = client ?? (await getHabiticaClient());
  const todos = await importFromHabitica(c);
  const habits = await importHabits(c);
  const dailies = await importDailies(c);
  return { todos, habits, dailies };
}
