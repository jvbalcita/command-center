// Habitica API v3 — typed subset used by Mission Control.

export type HabiticaTaskType = "habit" | "daily" | "todo" | "reward";

/** Plural forms used by `GET /tasks/user?type=`. */
export type HabiticaTaskQueryType =
  | "habits"
  | "dailys"
  | "todos"
  | "rewards"
  | "completedTodos";

// Habitica priority: 0.1 trivial, 1 easy, 1.5 medium, 2 hard
export type HabiticaPriority = 0.1 | 1 | 1.5 | 2;

export interface HabiticaChecklistItem {
  id?: string;
  text: string;
  completed: boolean;
}

export interface HabiticaTask {
  id: string;
  type: HabiticaTaskType;
  text: string;
  notes?: string;
  priority?: HabiticaPriority;
  completed?: boolean;
  value?: number;
  tags?: string[];
  checklist?: HabiticaChecklistItem[];
  date?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface HabiticaStats {
  hp: number;
  maxHealth: number;
  mp: number;
  maxMP: number;
  exp: number;
  toNextLevel: number;
  gp: number;
  lvl: number;
  class?: string;
  [key: string]: unknown;
}

export interface HabiticaUser {
  id: string;
  stats: HabiticaStats;
  [key: string]: unknown;
}

export interface HabiticaResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
  notifications?: unknown[];
}

export interface CreateTaskInput {
  text: string;
  type?: "habit" | "daily" | "todo";
  notes?: string;
  priority?: HabiticaPriority;
  date?: string; // ISO date (todos/dailies)
  checklist?: HabiticaChecklistItem[];
}


export interface CachedHabiticaStats {
  lvl: number;
  exp: number;
  toNextLevel: number;
  gp: number;
  hp: number;
  maxHealth: number;
  mp: number;
  maxMP: number;
  class?: string;
  fetchedAt: number;
}
