# Mission Control — Implementation Plan & Progress Tracker

> Working title: **Mission Control** (confirmed by Jack)
> A lightweight, open-source web app that is the single source of truth for everything we plan and do — with **Habitica** as its gamification + persistence engine.

**Owner:** Jack (Artisan Stack IT Solutions)
**Author/Executor:** Jarvis
**Created:** 2026-08-18
**Location:** `~/Documents/Development/command-center`

---

## 1. Goal

One place where any task Jack and I plan gets created, tracked, synced to Habitica, and reflected back as progress (XP/level/gold). Easy enough that anyone can `git clone` → `docker compose up` → use it with their own Habitica account.

## 2. Tech Stack (finalized)

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) + TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | SQLite (local file) via Drizzle ORM |
| Habitica | REST API client (server-side fetch) + scheduled sync |
| Auth | Single-user via `.env` secrets first; multi-user later |
| Runtime/Deploy | Docker Compose (self-host, one command); Vercel+Turso mode later |
| Testing | Vitest (unit) + Playwright (E2E) later |

## 3. Architecture

```
User / Jarvis  →  Next.js app (UI + API)  →  SQLite (canonical store)
                          │
                          └── sync jobs ──→ Habitica REST API (mirror + stats)
                          │
                    stats (XP/level/gold) ──→ dashboard
```

**"Source of everything" rule:** Jarvis reads/writes **only through this app** (a small API guarded by `JARVIS_API_KEY`, or the shared SQLite file directly). Every planned task lands here, then mirrors to Habitica.

## 4. Data Model (Drizzle + SQLite)

- `projects` — id, name, slug, color, created_at
- `tasks` — id, project_id, title, description, status, priority, due_at, habitica_id, habitica_type, created_at, updated_at, completed_at
- `habits` / `dailies` — (Phase 6) mirrors of Habitica
- `sync_log` — entity, entity_id, habitica_id, action, status, error, created_at
- `activity` — actor, action, entity, entity_id, meta, created_at ("what Jarvis did")
- `settings` — key, value (app config / per-user Habitica creds when multi-user)

## 5. Features

**MVP (v1)**
- Task CRUD + project grouping + priorities + due dates
- Two-way Habitica sync (create/complete/score)
- Dashboard: Today, due/overdue, Habitica stats (level/XP/gold)
- Command bar: quick natural add ("add task X due tomorrow @project")
- Activity log (audit trail)
- `.env.example` + README + Docker (anyone can use)

**Later**
- Habits & dailies surface + scoring
- Multi-user (per-user encrypted Habitica creds, OAuth)
- Notifications + streaks + gamified level-ups
- Jarvis conversational bridge (create/complete tasks from our chats)

---

## 6. Implementation Roadmap

### Phase 0 — Planning ✅
- [x] Scope, stack, architecture, data model (this doc)
- [x] Confirm project name — **Mission Control**
- [x] Author AGENTS.md (best-practices operating manual)
- [x] Confirm Habitica credentials availability

### Phase 1 — Scaffold & tooling
- [x] `create-next-app` (installed Next.js 16.3.1) (TS, Tailwind, ESLint, App Router, src-dir, `@/*`)
- [x] `git init` + `.gitignore` + initial commit
- [x] shadcn/ui init
- [x] Drizzle ORM + SQLite deps installed (`drizzle-orm`, `better-sqlite3`, `drizzle-kit`)
- [x] `.env.example` written (`HABITICA_USER_ID`, `HABITICA_API_TOKEN`, `JARVIS_API_KEY`)

### Phase 2 — Data layer
- [x] Drizzle schema (projects, tasks, sync_log, activity, settings)
- [x] Migrations + seed script (`drizzle/0000_*.sql` + `tsx` seed)
- [x] Repos/queries for tasks & projects

### Phase 3 — Habitica client
- [x] `src/lib/habitica/` — typed client (create/update/complete/score/getUser/list/delete)
- [x] Sync service + queue (idempotent `pushTask` + `syncTask`/`syncAll` + in-memory queue + `sync_log`)
- [x] Manual trigger (`sync:run`); scheduled cron → Phase 7 (needs creds)

### Phase 4 — Tasks UI
- [x] Project list + create (sidebar + NewProject dialog)
- [x] Task list with create/edit/complete/delete (dialogs + toggle + delete)
- [x] Priorities + due dates + project filter (badges + calendar + group-by-project)

### Phase 5 — Dashboard + command bar + activity
- [x] Dashboard: today, due/overdue stats (Habitica stats deferred → Phase 7)
- [x] Command bar quick-add (parse "X due tomorrow @project")
- [x] Activity log feed (ScrollArea, 50 latest)

### Phase 6 — Auth & secrets
- [ ] Single-user gate (read Habitica creds from env)
- [ ] `JARVIS_API_KEY`-guarded API (`POST /api/tasks`, `POST /api/tasks/:id/complete`)

### Phase 6.5 — Habitica parity: subtasks + difficulty (pre-pull)
> Prerequisite so Phase 7's pull has a place to land Habitica checklist items + difficulty.

- [x] Schema: add `tasks.difficulty` (trivial/easy/medium/hard, default easy) + `subtasks` table (task_id, title, completed, position)
- [x] Types/meta: `DIFFICULTIES` + `DIFFICULTY_META` (label + Habitica value 0.1/1/1.5/2)
- [x] Queries: subtasks CRUD + difficulty on task create/update
- [x] Validation: difficulty in taskSchema + subtaskSchema
- [x] Actions: difficulty in task create/update + checklist replace-on-save
- [x] UI: difficulty selector + checklist editor in task form; progress + difficulty badge on card
- [x] Habitica mapping helpers (difficulty <-> priority value, subtasks <-> checklist) for Phase 7 pull

### Phase 6.75 — Habits & Dailies (full Habitica parity)
> Two-way sync for Habits (+/- scoring) and Dailies (checkoff + streak + frequency). Combined Habits & Dailies board.

- [x] Schema: `habits` + `dailies` tables (habiticaId, difficulty, counters, frequency, repeatDays, streak, completedToday)
- [x] Migrations generated + applied (`0002`–`0004`, including `every_x` / monthly fields / sort order)
- [x] Queries: CRUD for habits + dailies + reorder
- [x] Client: `scoreHabit(id, direction)`, `completeDaily(id)` (already supported by `scoreTask`)
- [x] Import: `importHabits()`, `importDailies()`, unified `importAllFromHabitica()` (upsert by habiticaId)
- [x] Sync actions: `scoreHabitAction`, `completeDailyAction`, uncomplete, edit/delete push
- [x] UI: one **Habits & Dailies** kanban-style board; click-to-edit; no cross-column moves
- [x] Frequency: Repeat Every, weekly days, monthly day/week-of-month, yearly helper, greyed not-due cards
- [x] Scheduled + focus pull (Hermes cron every 5m + pull on board focus)
- [x] Tests for mapping, daily due-state, scoring rules, quick-add parser
- [ ] Reminders: sidebar badge (dailies due today), toast on missed, `checkMissedDailies()`

### Phase 7 — End-to-end sync
- [x] Difficulty-based push + import + stats panel (code complete, verified green)
- [x] Sync error handling + retry + `sync_log`
- [x] Wire Jack's Habitica creds
- [ ] Verify live round-trip: create task → appears in Habitica; complete → scores; stats → dashboard

### Phase 8 — Docker & docs
- [ ] Dockerfile + `docker-compose.yml`
- [ ] README: copy-paste "anyone can use" steps
- [ ] `.env.example` documented

### Phase 9 — Open-source prep
- [ ] LICENSE (MIT)
- [ ] CONTRIBUTING.md + issue/PR templates
- [ ] Publish to GitHub (public) + optional demo deployment

---

## 7. Milestones

| # | Milestone | Meaning |
|---|---|---|
| M1 | App boots locally | `npm run dev` → homepage loads |
| M2 | Tasks work locally | CRUD on SQLite, no Habitica yet |
| M3 | Habitica sync live | Task created here → appears in Habitica |
| M4 | Dashboard live | Stats flow back from Habitica |
| M5 | Anyone-can-use | Docker one-command + README |
| M6 | Published | Public GitHub + optional demo |

## 8. Open Items / Blockers

- [x] Habitica User ID + API Token (needed for live round-trip verification)
- [x] Project name — **Mission Control**
- [ ] License choice (default MIT)

## 9. Progress Tracking Convention

- Each checkbox above = one task; tick `[x]` when done.
- **Progress is tracked in Mission Control** (project tasks + subtasks). PLAN.md stays the architecture/roadmap doc.
- Jarvis updates PLAN.md checkboxes when a phase item ships, and creates/completes matching Command Center tasks.

---

## Recent work (2026-08-20) — Habits & Dailies board + sync

- [x] Combined Habits + Dailies into one Habitica-style board (reorder in-column only)
- [x] Click-to-edit dialogs with delete; unified Import
- [x] Habitica frequency parity (`everyX`, monthly day/week, yearly helper)
- [x] Not-due dailies look disabled but stay completable
- [x] Quick add: prefix `@project`, strip unmatched tokens, live preview
- [x] Pull on board focus + Hermes cron every 5 minutes
- [x] Score/complete still `POST /tasks/:id/score/:direction` so Habitica awards XP/GP

---

## Recent work (2026-08-18) — design system + kanban

- [x] Fonts: **Space Grotesk** (headings) + **Oxanium** (body/UI) via `next/font/google`
- [x] Theme: **teal** primary + **orange** accent on neutral "Mist" base — full **dark mode** with `next-themes` toggle
- [x] Sidebar: `sidebar-07` collapsible shell (HugeIcons, teal)
- [x] Kanban board: **Todo → In Progress → Done**, drag-to-move status (`@dnd-kit`), `moveTaskAction` + `setTaskStatus`
- [ ] Apply **Rhea** style (currently `base-nova`) — deferred; needs clean re-init to avoid clobbering HugeIcons swap

## Recent work (2026-08-18, Phase 5)
- Fixed kanban drag bug: removed transform on dragged card (ghost at 40% opacity) + fixed-width DragOverlay.
- Wired shadcn components into task form: `Select` (priority, project) + `Popover`/`Calendar` date picker (with Clear). Swapped all lucide → HugeIcons in select.tsx/calendar.tsx.
- Added `logActivity` + `listActivity` to queries; all server actions now log to `activity`.
- Added `DashboardStats` (Total/Open/In progress/Due today/Overdue), `ActivityFeed` (right panel), `CommandBar` (Cmd+K quick-add).

## Recent work (2026-08-18, polish batch)
- Fixed hydration mismatch (dnd-kit useUniqueId counter → stable `id` on DndContext).
- Project select now shows name (SelectValue function-child); priority capitalized.
- Added project ellipsis menu (edit/delete) + AlertDialog confirmations for all destructive actions.
- Activity feed wrapped in ScrollArea; command bar gained NL parsing (`@project #priority due:tomorrow`) + tests (14 total).
- Habitica connections settings dialog (save/test/sync) → `settings` table, env fallback.
- Consolidated agentic-coding best practices into CLAUDE.md.

## Recent work (2026-08-18, Phase 7)
- Live Habitica sync: difficulty-based push (difficulty → priority, subtasks → checklist), import-from-Habitica (idempotent, skips already-linked), cached stats panel (level/XP/gold/HP/MP).
- Settings dialog save/test/sync + import/refresh actions (`syncNowAction`, `importFromHabiticaAction`, `refreshHabiticaStatsAction`).
- Hygiene: added `.env.example`, fixed `.gitignore` negation, stopped passing the Habitica API token to the client.
- Verified: `typecheck` ✓, `lint` ✓, `test` 14/14 ✓, `build` ✓ (live round-trip still pending Jack's real creds).
