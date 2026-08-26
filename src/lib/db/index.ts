import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
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
    // Clear old better-sqlite3 database if incompatible
    if (existsSync(dbPath)) {
      const header = readFileSync(dbPath);
      if (!header.subarray(0, 16).toString().startsWith("SQLite format")) {
        writeFileSync(dbPath, Buffer.alloc(0));
      }
    }

    // Load existing database or create new one
    let sqlDb;
    if (existsSync(dbPath)) {
      const buffer = readFileSync(dbPath);
      if (buffer.length > 0) {
        sqlDb = new SQL.Database(new Uint8Array(buffer));
      } else {
        sqlDb = new SQL.Database();
      }
    } else {
      sqlDb = new SQL.Database();
    }

    // Enable WAL mode and foreign keys
    sqlDb.run("PRAGMA journal_mode = WAL");
    sqlDb.run("PRAGMA foreign_keys = ON");

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

    // Run migrations if tables don't exist
    const tableCheck = sqlDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'");
    if (tableCheck.length === 0 || !tableCheck[0]?.values?.length) {
      try {
        const { migrate } = require("drizzle-orm/sql-js/migrator");
        const path = require("path");
        migrate(_db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
        save();
      } catch (e: any) {
        console.error("Migration failed:", e.message);
      }
    }
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
 * Get the database instance. Call this at the start of each route handler.
 */
export async function getDb() {
  if (_db) return _db;
  if (!_initPromise) _initPromise = initDb();
  _db = await _initPromise;
  return _db;
}

// Lazy proxy — works for better-sqlite3 (sync), throws for sql.js cold start
export const db = new Proxy({} as any, {
  get(_target, prop) {
    if (_db) {
      const value = (_db as any)[prop];
      return typeof value === "function" ? value.bind(_db) : value;
    }
    throw new Error(
      "Database not initialized. Call await getDb() before using db.",
    );
  },
});
