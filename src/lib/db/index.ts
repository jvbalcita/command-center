import * as schema from "./schema";

const isDocker =
  typeof process !== "undefined" &&
  (require("node:fs").existsSync("/.dockerenv") ||
    process.env.DOCKER_ENV === "true");

let _db: any = null;
let _initPromise: Promise<any> | null = null;

// ── Better-sqlite3 (local dev) ────────────────────────────────
function initBetterSqlite3() {
  if (_db) return _db;
  const { mkdirSync } = require("node:fs");
  const { dirname, resolve } = require("node:path");
  const dbPath = resolve(
    process.env.DATABASE_URL ?? "./data/mission-control.db",
  );
  mkdirSync(dirname(dbPath), { recursive: true });
  const Database = require("better-sqlite3");
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const { drizzle } = require("drizzle-orm/better-sqlite3");
  _db = drizzle(sqlite, { schema });
  return _db;
}

// ── sql.js (Docker) ───────────────────────────────────────────
async function initSqlJsDb() {
  if (_db) return _db;
  const { mkdirSync, existsSync, readFileSync, readdirSync, writeFileSync } =
    require("node:fs");
  const { dirname, resolve } = require("node:path");

  const dbPath = resolve(
    process.env.DATABASE_URL ?? "./data/mission-control.db",
  );
  mkdirSync(dirname(dbPath), { recursive: true });

  // 1. Load sql.js and WASM
  const initSqlJs = require("sql.js");
  const wasmPath = resolve(
    process.cwd(),
    "node_modules/sql.js/dist/sql-wasm.wasm",
  );
  const SQL = await initSqlJs({ locateFile: () => wasmPath });

  // 2. Load or create database
  let sqlDb: any;
  if (existsSync(dbPath)) {
    const buf = readFileSync(dbPath);
    // Check for better-sqlite3 incompatible file (no SQLite magic header)
    const magic = buf.slice(0, 16).toString("ascii");
    if (magic.startsWith("SQLite format")) {
      sqlDb = new SQL.Database(new Uint8Array(buf));
    } else {
      console.log("[DB] Clearing incompatible database file");
      sqlDb = new SQL.Database();
    }
  } else {
    sqlDb = new SQL.Database();
  }

  // 3. Run migrations if tables don't exist
  const check = sqlDb.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'",
  );
  if (check.length === 0 || check[0].values.length === 0) {
    console.log("[DB] Tables not found — running migrations...");
    const drizzleDir = resolve(process.cwd(), "drizzle");
    if (existsSync(drizzleDir)) {
      const files = readdirSync(drizzleDir)
        .filter((f: string) => f.endsWith(".sql"))
        .sort();
      for (const file of files) {
        const sql = readFileSync(resolve(drizzleDir, file), "utf8");
        try {
          sqlDb.run(sql);
          console.log(`[DB] Applied: ${file}`);
        } catch (err: any) {
          console.log(`[DB] Skipped ${file}: ${err.message}`);
        }
      }
    }
  }

  // 4. Save periodically and on exit
  const save = () => {
    const data = sqlDb.export();
    writeFileSync(dbPath, Buffer.from(data));
  };
  setInterval(save, 5000);
  process.on("exit", save);
  process.on("SIGINT", () => {
    save();
    process.exit();
  });
  process.on("SIGTERM", () => {
    save();
    process.exit();
  });

  // 5. Wrap with drizzle
  const { drizzle } = require("drizzle-orm/sql-js/driver");
  _db = drizzle(sqlDb, { schema });
  return _db;
}

// ── Public API ────────────────────────────────────────────────
export async function getDb() {
  if (_db) return _db;
  if (!isDocker) return initBetterSqlite3();
  _initPromise = _initPromise || initSqlJsDb();
  return _initPromise;
}

/**
 * Lazy proxy — better-sqlite3 is sync (instant on first access),
 * sql.js is async (returns promise proxy until init completes).
 */
export const db: any = new Proxy({} as any, {
  get(_target, prop) {
    if (prop === "getDb") return getDb;
    if (prop === "then") return undefined;

    if (_db) {
      const v = _db[prop];
      return typeof v === "function" ? v.bind(_db) : v;
    }

    // Sync path (better-sqlite3, local dev)
    if (!isDocker) {
      _db = initBetterSqlite3();
      const v = _db[prop];
      return typeof v === "function" ? v.bind(_db) : v;
    }

    // Async path (sql.js, Docker) — trigger init, return promise proxy
    _initPromise = _initPromise || initSqlJsDb();
    return new Proxy({} as any, {
      get: (_, p) =>
        (...args: any[]) =>
        _initPromise!.then((d: any) => d[p](...args)),
    });
  },
});
