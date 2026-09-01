import * as schema from "./schema";

const isDocker =
  typeof process !== "undefined" &&
  (require("node:fs").existsSync("/.dockerenv") || process.env.DOCKER_ENV === "true");

// PRAGMA application_id marker to distinguish sql.js exports from better-sqlite3 files.
// 0x4d435f53 = "MCS\0" in big-endian — set on every sql.js export, checked on load.
const MARKER_APP_ID = 0x4d435f53;
const MARKER_NAME = "MCS";

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

  // DIFFERENT default path — prevents collision with better-sqlite3 file
  const dbPath = resolve(
    process.env.DATABASE_URL ?? "./data/mission-control.sqljs.db",
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
    // Check for sql.js marker — refuses better-sqlite3 files that share the same magic header
    sqlDb = new SQL.Database(new Uint8Array(buf));
    const checkAppId = sqlDb.exec("PRAGMA application_id");
    const currentAppId =
      checkAppId.length > 0 ? checkAppId[0].values[0][0] : 0;
    if (currentAppId !== MARKER_APP_ID) {
      console.error(
        `[DB] Refusing to load ${dbPath} — not an sql.js file (application_id=0x${(currentAppId >>> 0).toString(16)}). ` +
          `This is likely a better-sqlite3 database. Move or rename it before starting Docker.`,
      );
      process.exit(1);
    }
  } else {
    sqlDb = new SQL.Database();
    // Set marker on fresh databases
    sqlDb.run(`PRAGMA application_id = ${MARKER_APP_ID}`);
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

  // 4. Save periodically and on exit — with integrity check
  const save = () => {
    try {
      const integrity = sqlDb.exec("PRAGMA integrity_check");
      const result = integrity.length > 0 ? integrity[0].values[0][0] : "ok";
      if (result !== "ok") {
        console.error(
          `[DB] Integrity check failed: ${result} — refusing to save`,
        );
        return;
      }
    } catch (err: any) {
      console.error(
        `[DB] Integrity check error: ${err.message} — refusing to save`,
      );
      return;
    }
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
