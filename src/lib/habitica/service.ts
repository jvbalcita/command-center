// Re-export all public API from focused modules for backward compatibility.
// All existing `import { ... } from "@/lib/habitica/service"` paths continue to work.

export { getHabiticaClient } from "./client-factory";
export { syncTaskToHabitica, deleteTaskInHabitica, syncAllTasks } from "./task-sync";
export type { ImportResult } from "./import";
export { importFromHabitica, importHabits, importDailies, importRoutines, importAllFromHabitica } from "./import";
export { pushHabitToHabitica, pushDailyToHabitica } from "./push";
export { difficultyToHabiticaPriority } from "./mapping";
export { scoreHabitInHabitica, completeDailyInHabitica, uncompleteDailyInHabitica } from "./habit-daily-sync";
export { getCachedHabiticaStats, refreshHabiticaStats } from "./stats";
export { enqueueTaskSync } from "./queue";
