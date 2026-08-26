import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "./schema";

// Detect Docker environment
const isDocker =
  existsSync("/.dockerenv") || process.env.DOCKER_ENV === "true";

let _db: any = null;
let _initPromise: Promise<any> | null = null;

async function initDb() {
  if (_db) return _db;

  const dbPath = resolve(
    /* turbopackIgnore: true */ process.env.DATABASE_URL ??
      "./data/mission-control.db",
  );
  mkdirSync(dirname(dbPath), { recursive: true });

  if (isDocker) {
    // ── Docker: use sql.js (pure JS, no native modules) ────────
    const initSqlJs = require("sql.js");
    const wasmPath = resolve(process.cwd(), "node_modules/sql.js/dist/sql-wasm.wasm");
    const SQL = await initSqlJs({ locateFile: () => wasmPath });
    const sqlDb = new SQL.Database();

    sqlDb.run("PRAGMA journal_mode = WAL");
    sqlDb.run("PRAGMA foreign_keys = ON");

    // Run migrations if tables don't exist
    const tables = sqlDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'");
    if (tables.length === 0 || tables[0].values.length === 0) {
      console.log("[DB] Tables not found — running migrations...");
      const drizzleDir = resolve(process.cwd(), "drizzle");
      if (existsSync(drizzleDir)) {
        const files = readdirSync(drizzleDir)
          .filter((f) => f.endsWith(".sql"))
          .sort();
        for (const file of files) {
          const sql = readFileSync(resolve(drizzleDir, file), "utf8");
          try {
            sqlDb.run(sql);
            console.log(`[DB] Applied migration: ${file}`);
          } catch (err) {
            console.log(`[DB] Migration ${file} skipped: ${(err as Error).message}`);
          }
        }
      }
    }

    // Save periodically and on exit
    const save = () => {
      const data = sqlDb.export();
      writeFileSync(dbPath, Buffer.from(data));
    };
    setInterval(save, 5000);
    process.on("exit", save);
    process.on("SIGINT", () => { save(); process.exit(); });
    process.on("SIGTERM", () => { save(); process.exit(); });

    const { drizzle } = require("drizzle-orm/sql-js/driver");
    _db = drizzle(sqlDb, { schema });
  } else {
    // ── Local: use better-sqlite3 (faster, native) ─────────────
    const Database = require("better-sqlite3");
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    const { drizzle } = require("drizzle-orm/better-sqlite3");
    _db = drizzle(sqlite, { schema });
  }

  return _db;
}

/**
 * Ensure the database is initialized. Returns the drizzle instance.
 */
export async function getDb() {
  if (_db) return _db;
  if (!_initPromise) _initPromise = initDb();
  _db = await _initPromise;
  return _db;
}

// Lazy proxy — works for better-sqlite3 (sync), async for sql.js
export const db = new Proxy({} as any, {
  get(_target, prop) {
    if (prop === "getDb" || prop === "then") {
      if (prop === "then") return undefined;
      return getDb;
    }

    if (_db) {
      const value = (_db as any)[prop];
      return typeof value === "function" ? value.bind(_db) : value;
    }

    // Try sync init (works for better-sqlite3)
    try {
      const dbPath = resolve(
        /* turbopackIgnore: true */ process.env.DATABASE_URL ??
          "./data/mission-control.db",
      );
      mkdirSync(dirname(dbPath), { recursive: true });
      const Database = require("better-sqlite3");
      const sqlite = new Database(dbPath);
      sqlite.pragma("journal_mode = WAL");
      sqlite.pragma("foreign_keys = ON");
      const { drizzle } = require("drizzle-orm/better-sqlite3");
      _db = drizzle(sqlite, { schema });
      const value = (_db as any)[prop];
      return typeof value === "function" ? value.bind(_db) : value;
    } catch {
      // sql.js — trigger async init
      if (!_initPromise) _initPromise = initDb();
      return new Proxy({} as any, {
        get(_t2, prop2) {
          if (prop2 === "then") {
            return (resolve: any) => _initPromise!.then((d: any) => {
              const v = (d as any)[prop];
              resolve(typeof v === "function" ? v.bind(d) : v);
            });
          }
          return (...args: any[]) =>
            _initPromise!.then((d: any) => {
              const fn = (d as any)[prop];
              return typeof fn === "function" ? fn.bind(d)(...args) : fn;
            });
        },
      });
    }
  },
});
