# Mission Control — Agent Instructions

> Operating manual for AI coding agents (and future-me) working in this repository.
> Read this fully before writing code. It is the contract the project must honor.

## 1. What this is

**Mission Control** is a lightweight, open-source web app that serves as the **single source of truth for everything Jack and Jarvis plan and do** — and syncs that work with **Habitica** for gamification (XP/levels/gold) and persistence.

- A task is created here → stored locally (canonical) → mirrored to Habitica.
- Habitica stats flow back → surfaced on the dashboard.
- Jarvis reads/writes **only through this app** (a small API guarded by `JARVIS_API_KEY`, or the shared SQLite file).

Design goal: **anyone** can `git clone` → `docker compose up` → use it with their own Habitica account.

## 2. Tech stack (locked)

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 4 + shadcn/ui (Base UI) |
| Database | SQLite via Drizzle ORM (`better-sqlite3`) |
| External API | Habitica REST API (server-side fetch) |
| Auth | Single-user via `.env` secrets first |
| Distribution | Docker Compose (self-host, one command) |
| Testing | Vitest (unit) + Playwright (E2E, later) |

## 3. Commands (standard script names — keep these)

```bash
npm run dev          # local dev server
npm run build        # production build
npm run start        # serve production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit (strict)
npm run test         # Vitest
npm run db:generate  # drizzle-kit generate
npm run db:migrate   # drizzle-kit migrate / push
npm run db:studio    # drizzle-kit studio
npm run db:seed      # seed dev data (tsx)
npm run sync:run     # manual Habitica sync (needs creds)
npm run mc -- help   # agent CLI for tasks/subtasks (no seed files)
```

## 4. Directory structure

```
src/
  app/                 # App Router — pages + route handlers (API)
    api/               #   API routes (tasks, sync, stats, habitica)
  components/          # shadcn/ui + app components
    ui/                #   shadcn/ui primitives (generated)
  lib/                 # core logic (no React)
    db/                #   Drizzle client + schema + queries
    habitica/          #   Habitica API client + sync service
    validation/        #   zod schemas
  hooks/               # client hooks
drizzle/               # schema + migrations
public/                # static assets
.env.example           # documented placeholders (COMMIT this)
.env                   # real secrets (NEVER commit)
docker-compose.yml
Dockerfile
README.md
```

## 5. Conventions

- **TypeScript strict** — no `any`, no `@ts-ignore`, no `as unknown as`.
- **Server Components by default**; add `"use client"` only for interactivity.
- **Server Actions** for mutations; Route Handlers only for the Jarvis API + webhooks.
- **Import alias** `@/*` → `src/*` (never relative `../../`).
- **ESLint + Prettier** enforced; no `eslint-disable` without a comment explaining why.
- **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- Components: one per file, named exports for primitives, default exports for pages.
- **Track Command Center build work** on the **Mission Control** project with `npm run mc -- … --project "Mission Control"`. Other work goes on its own project. Anything without a project goes to **Inbox** (`npm run mc -- add "…"`, no `--project`). Never dump all todos onto Mission Control.

## 6. Data access rules

- **All** DB access through Drizzle queries in `src/lib/db/` — no raw SQL in routes.
- Migrations are committed; schema changes ship with a migration.
- `tasks` carry a `habitica_id` and `habitica_type` once synced — never delete a synced task without handling its Habitica counterpart.

## 7. Habitica integration rules

- Single typed client in `src/lib/habitica/` — no ad-hoc `fetch` to Habitica elsewhere.
- **Idempotent** sync: retries must not duplicate tasks. Use `habitica_id` as the dedup key.
- **Never block the UI on sync.** Sync runs as queued/background work with retry + `sync_log`.
- Respect Habitica rate limits; log failures to `sync_log` with the error, don't silently swallow.
- Store credentials **only** as env vars / `.env`; never in code, DB dumps, logs, or commits.

## 8. Security (hard rules — non-negotiable)

- **NEVER commit secrets**: `HABITICA_USER_ID`, `HABITICA_API_TOKEN`, `JARVIS_API_KEY`.
- `.env` is gitignored; `.env.example` contains only placeholders.
- Never log secrets, tokens, or full request bodies with credentials.
- Validate **all** external input (zod) before it touches the DB or Habitica.
- The Jarvis API (`/api/*`) is guarded by `JARVIS_API_KEY` — reject unauthenticated requests.

## 9. Testing

- Unit-test the Habitica client + sync service with mocked `fetch` (no live network in CI).
- Test query logic and validation schemas.
- E2E (Playwright, later) for the core flow: create task → sync → complete.
- Definition of done: `typecheck` clean, `lint` clean, `test` green, `build` passes.

## 10. Git workflow

- Branch per feature/fix off `main`; small, focused PRs.
- PR title follows Conventional Commits.
- Don't merge with failing checks.

## 11. Do / Don't

**Do**
- Keep it lightweight — no dependency without a clear reason.
- Use existing shadcn/ui components instead of hand-rolling.
- Write tests for the sync layer (it's the fragile part).
- Update this file if conventions genuinely change.

**Don't**
- Add a dependency without justification (note it in the PR).
- Commit `.env`, secrets, or generated build artifacts.
- Block the UI on Habitica calls.
- Reinvent components that shadcn/ui already provides.

## 12. Definition of done

A task is done when: **typecheck ✓, lint ✓, tests ✓, build ✓**, and (where relevant) the Habitica sync round-trip is verified against a test account.

## Design System (added 2026-08-18)

Use the **ui-ux-pro-max** skill for all UI/UX decisions. The persisted design system is the single source of visual truth: `design-system/mission-control/MASTER.md`.

- **Dials:** variance 6 (balanced/modern) · motion 3 (subtle) · density 6 (standard)
- **Style:** Flat Design — light + dark, minimalist, typography-focused, no gradients/shadows
- **Palette:** teal primary `#0D9488`, orange accent `#EA580C` (full tokens in MASTER.md)
- **Type:** Plus Jakarta Sans
- **Icons:** HugeIcons (`@hugeicons/react`) — do NOT use Lucide
- **Palette status:** teal #0D9488 + orange #EA580C is provisional — Jack judges after full build
- **Motion:** subtle only (150–300ms), respect `prefers-reduced-motion`

**Hard design rules (no AI slop):**
- Fast + responsive (375/768/1024/1440), mobile-first, no horizontal scroll
- SVG icons (HugeIcons, `@hugeicons/react`) — never emoji as icons
- Contrast ≥ 4.5:1, visible focus states, cursor-pointer on clickables
- Semantic color tokens only — no raw hex in components
- Run the Pre-Delivery Checklist in MASTER.md before shipping any UI

## Stack notes (2026-08-18)

- **shadcn/ui now uses Base UI** (`@base-ui/react/*`), not Radix. Use `render={<Button />}` on triggers instead of `asChild`; `DialogTrigger` accepts `className`/`aria-*` directly.
- **Icons = HugeIcons**: renderer `@hugeicons/react` (`HugeiconsIcon`) + icon set `@hugeicons/core-free-icons` (named `XxxIcon` exports). Usage: `<HugeiconsIcon icon={Rocket02Icon} size={18} strokeWidth={1.8} />`. Do NOT use Lucide.
- **Forms**: client `handleSubmit(formData)` + `useTransition` calling a server action (avoids the `react-hooks/set-state-in-effect` lint error). Server actions return `ActionState` (`{ ok, error? }`).

## UI shell (2026-08-18)

- **Responsive app shell = shadcn Sidebar block**: `SidebarProvider` + `<Sidebar collapsible="icon">` + `SidebarInset` + `SidebarTrigger`. Desktop collapses to icons; mobile auto-renders as a `Sheet` drawer. Wrap app in `TooltipProvider` (needed for sidebar tooltips).
- **`use-mobile`** hook uses `useSyncExternalStore` (not `useEffect`+`setState` — that trips `react-hooks/set-state-in-effect`).
- **All lucide defaults replaced with HugeIcons** (dialog/sheet close `Cancel01Icon`, sidebar trigger `Menu01Icon`, dropdown `ArrowRight01Icon`/`Tick01Icon`).
- `SidebarMenuButton` uses `render={<Link href="..." />}` (Base UI) + `tooltip` prop, not `asChild`.

## Agentic coding best practices (2026-08-18)

These are hard-won guardrails for this exact stack. Violating them produces
bugs that are subtle and expensive to debug — read before every change.

### Server vs Client components
- **Server Components by default.** Only add `"use client"` when you need
  state, effects, event handlers, or browser APIs.
- Server components render once (SSR) and are **not** re-rendered on the client,
  so `new Date()` / `Date.now()` there is fine. It is NOT fine in client
  components that hydrate.
- Client components must render **deterministically** — see hydration below.

### Hydration safety (the #1 footgun)
A client component that renders different output on server vs client throws
"tree hydrated but attributes didn't match". Causes we hit and how to avoid:

1. **Relative date/time** (`new Date()`, `toLocaleDateString()` without an
   explicit locale). Use a fixed format (manual month/day arrays) or
   `suppressHydrationWarning` on the leaf element.
2. **`Math.random()` / module-level counters in dependencies.** dnd-kit's
   `useUniqueId` uses a non-SSR-safe counter. **Fix: pass a stable `id` to
   `<DndContext id="...">`** — it makes `aria-describedby` deterministic.
3. **`typeof window !== 'undefined'` branching** — never gate render output on it.
4. **Media queries** — use `useSyncExternalStore`, not `useEffect`+`setState`.
5. **Theme** — `next-themes` with `attribute="class"` + `suppressHydrationWarning`
   on `<html>`; in toggles use a `mounted` flag before reading `resolvedTheme`.

**Verify:** after any change to a client component, run a headless Chrome dump
and grep the console for `hydration` (see §Commands for the one-liner).

### Server Actions + forms
- Mutations are **Server Actions** (`"use server"`), returning `ActionState`
  `{ ok: boolean; error?: string }`.
- Client form handler: `handleSubmit(formData)` + `useTransition` → call the
  action. Do **not** use uncontrolled inputs read at submit via `formData.get()`
  with Base UI widgets that don't submit a native value — add hidden inputs for
  `priority`/`projectId`/`dueDate` and keep them in React state.

### Base UI (shadcn) quirks
- Triggers use `render={<Button />}` (NOT Radix `asChild`).
- `Select.Value` renders the **raw value** when the popup items aren't mounted
  (closed). Use a **function-child** `<SelectValue>{(v) => label}</SelectValue>`
  to resolve a display label (e.g. project name from id).
- Base UI `Separator` applies `data-vertical:self-stretch`; combined with a
  constrained `h-4` it **top-aligns**. For a short centered divider, use a plain
  `<div className="h-4 w-px shrink-0 bg-border" />`.
- Destructive confirmations use shadcn `AlertDialog` (Base UI). `AlertDialogAction`
  is a plain Button (won't auto-close) — handle close + action in its `onClick`.

### Icons
- HugeIcons only. `<HugeiconsIcon icon={XxxIcon} size={n} strokeWidth={1.8} />`.
- Never Lucide. If a newly added shadcn component imports lucide, swap it
  immediately (select → `ArrowDown01Icon`/`Tick01Icon`, calendar →
  `ArrowLeft01Icon`/`ArrowRight01Icon`, dialog close → `Cancel01Icon`, etc.).

### Data + secrets
- All DB access through Drizzle queries in `src/lib/db/queries.ts`. Migrations
  are committed. Timestamps are `timestamp_ms` (return `Date` objects).
- Secrets never in code/logs/commits. `.env` gitignored; `.env.example` committed.
- Habitica creds: read from DB `settings` table **first**, fall back to env
  (`getHabiticaClient()`). Managed via the Settings dialog, not hand-edited env.
- Sync must be idempotent and **never block the UI**; failures go to `sync_log`.

### Verification (Definition of Done)
Run all of these and fix before calling a change done:
```bash
npm run typecheck && npm run lint && npm run test && npm run build
# hydration check (headless Chrome):
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --headless=new --disable-gpu --no-sandbox --enable-logging=stderr --v=0 \
  --virtual-time-budget=5000 --dump-dom http://localhost:3000/ 2>&1 | grep -i hydration
```
