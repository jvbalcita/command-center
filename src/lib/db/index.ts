import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// Lazy singleton — initialized on first use, not at import time.
// This avoids SIGSEGV during Next.js build (page data collection
// tries to import this module before the filesystem is ready).
let _db: BetterSQLite3Database<typeof schema> | null = null;

function getDb(): BetterSQLite3Database<typeof schema> {
  if (_db) return _db;

  const dbPath = resolve(
    /* turbopackIgnore: true */ process.env.DATABASE_URL ??
      "./data/mission-control.db",
  );
  mkdirSync(dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  _db = drizzle(sqlite, { schema });
  return _db;
}

// Proxy that delegates to the lazy getter.
// All property accesses go through getDb(), so the DB is only
// opened when the first query runs (never during import/build).
export const db: BetterSQLite3Database<typeof schema> = new Proxy(
  {} as BetterSQLite3Database<typeof schema>,
  {
    get(_target, prop, receiver) {
      const real = getDb();
      const value = Reflect.get(real, prop, receiver);
      if (typeof value === "function") {
        return value.bind(real);
      }
      return value;
    },
  },
);
