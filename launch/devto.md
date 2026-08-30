---
title: "Command Center: Building a Local-First Personal Ops App for AI Agents"
published: false
description: "How I built a local-first personal operations app with Habitica sync and AI agent support"
tags: productivity, open source, ai, selfhosted
cover_image: https://github.com/jvbalcita/command-center/raw/main/public/logo.svg
---

## Why I Built Command Center

I wanted my AI agent to manage my tasks while I sleep.

Most productivity apps are cloud-first and closed. You upload your data, trust their servers, and pray their API doesn't change. I wanted something different:

- **Local-first** – My data stays on my machine
- **API-first** – Any agent can manage my tasks
- **Habitica-native** – RPG-style gamification that actually syncs

So I built [Command Center](https://github.com/jvbalcita/command-center).

## What It Does

Command Center is a personal operations app that combines:

1. **Kanban task management** – Projects, priorities, due dates, drag-and-drop
2. **Habit tracking** – Up/down scoring, streaks, frequency scheduling
3. **Daily routines** – Streaks, completion tracking, automated scoring
4. **Habitica sync** – Two-way sync for tasks, habits, and dailies
5. **REST API** – Programmatic access for agents and automation
6. **Docker deployment** – One command to self-host

## The Agent Angle

Here's the key insight: **if your productivity app has a REST API, any AI agent can manage your workflow.**

```bash
# Hermes Agent
npm run mc -- list --json
npm run mc -- add "Ship feature"
npm run mc -- done 42

# Any Agent (HTTP)
curl localhost:3000/api/tasks
curl -X POST localhost:3000/api/tasks \
  -d '{"title":"Task"}'

# CLI Agents
curl http://host:3000/api/tasks
```

My Hermes Agent uses the CLI to manage tasks, but Claude, GPT, or any HTTP-capable agent can use the REST API. Multiple agents can even collaborate on the same board.

## The Habitica Integration

I'm a big fan of Habitica's gamification model, but I wanted a local-first app that could:

1. Create tasks here → sync to Habitica automatically
2. Complete tasks → award XP/GP
3. Score habits up/down → sync to Habitica
4. Track daily streaks and frequency
5. Import existing Habitica data

The sync is two-way. Create a task in Command Center, it appears in Habitica. Complete it in Habitica, it updates in Command Center.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, shadcn/ui, Tailwind CSS 4 |
| Database | SQLite (better-sqlite3) |
| ORM | Drizzle ORM |
| Habitica | REST API client |
| Testing | Vitest |
| Language | TypeScript 5.7 |
| Deploy | Docker Compose |

## Quick Start

```bash
git clone https://github.com/jvbalcita/command-center.git
cd command-center

# With Docker
docker compose up -d

# Or manually
npm install
npm run db:push
npm run dev

# Open http://localhost:3000
```

## What's Next

- [ ] Multi-user support with encrypted Habitica credentials
- [ ] Notifications and reminders
- [ ] E2E testing with Playwright
- [ ] Demo deployment
- [ ] More automation rule types

## Open Source

Command Center is MIT licensed and open for contributions. Check out the [GitHub repo](https://github.com/jvbalcita/command-center) and let me know what you think!

**GitHub:** https://github.com/jvbalcita/command-center

---

*Built with ☕ and ⚡ by developers, for developers.*
