# Mission Control — Implementation Plan & Progress Tracker

> Working title: **Mission Control** (confirmed by Jack)
> A lightweight, open-source web app that is the single source of truth for everything we plan and do — with **Habitica** as its gamification + persistence engine.

**Owner:** Jack (Artisan Stack IT Solutions)
**Author/Executor:** Jarvis
**Created:** 2026-08-18
**Location:** `~/Documents/Development/Projects/artisan-stack/command-center`

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
- [ ] Confirm Habitica credentials availability

### Phase 1 — Scaffold & tooling
- [x] `create-next-app` (installed Next.js 16.3.1) (TS, Tailwind, ESLint, App Router, src-dir, `@/*`)
- [x] `git init` + `.gitignore` + initial commit
- [x] shadcn/ui init
- [x] Drizzle ORM + SQLite deps installed (`drizzle-orm`, `better-sqlite3`, `drizzle-kit`)
- [x] `.env.example` written (`HABITICA_USER_ID`, `HABITICA_API_TOKEN`, `JARVIS_API_KEY`)

### Phase 2 — Data layer
- [ ] Drizzle schema (projects, tasks, sync_log, activity, settings)
- [ ] Migrations + seed script
- [ ] Repos/queries for tasks & projects

### Phase 3 — Habitica client
- [ ] `src/lib/habitica.ts` — typed client (create task, complete, score, get user stats)
- [ ] Sync service + queue (create/update/complete → Habitica)
- [ ] Scheduled sync (cron/interval) + manual trigger

### Phase 4 — Tasks UI
- [ ] Project list + create
- [ ] Task board/list with create/edit/complete/delete
- [ ] Priorities + due dates + project grouping

### Phase 5 — Dashboard + command bar + activity
- [ ] Dashboard: today, due/overdue, Habitica stats
- [ ] Command bar quick-add (parse "X due tomorrow @project")
- [ ] Activity log page

### Phase 6 — Auth & secrets
- [ ] Single-user gate (read Habitica creds from env)
- [ ] `JARVIS_API_KEY`-guarded API (`POST /api/tasks`, `POST /api/tasks/:id/complete`)

### Phase 7 — End-to-end sync (with real creds)
- [ ] Wire Jack's Habitica creds
- [ ] Verify: create task → appears in Habitica; complete → scores; stats → dashboard
- [ ] Sync error handling + retry + `sync_log`

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

- [ ] Habitica User ID + API Token (needed at Phase 7)
- [x] Project name — **Mission Control**
- [ ] License choice (default MIT)

## 9. Progress Tracking Convention

- Each checkbox above = one task; tick `[x]` when done.
- Jarvis updates this file + a daily `memory/YYYY-MM-DD.md` note at the end of each working session.
- Milestones M1–M6 gate progress; anything blocked gets logged under §8.
