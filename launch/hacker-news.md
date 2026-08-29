# Show HN: Command Center – Local-first personal ops app built for AI agents

**Title:** Show HN: Command Center – Local-first personal ops app built for AI agents

**Post:**

Hey HN,

I built Command Center – a local-first personal operations app for developers who want to own their productivity stack.

**What it does:**
- Kanban task management with projects, priorities, and due dates
- Habit tracking with up/down scoring and streaks
- Daily routines with frequency scheduling
- Two-way Habitica sync (tasks, habits, dailies)
- REST API for programmatic access
- Docker one-command deployment

**Why it's different:**
Most productivity apps are cloud-first and closed. Command Center is:
- **Local-first** – SQLite on your machine, no cloud dependency
- **Agent-agnostic** – Any AI agent (Hermes, Claude, GPT) can manage your tasks via REST API or CLI
- **Habitica-native** – Two-way sync for RPG-style gamification
- **Open source** – MIT licensed, self-hostable

**The agent angle:**
I wanted my AI agent to manage my tasks while I sleep. So I built an app where:
- Hermes Agent can create, complete, and score tasks via CLI (`npm run mc`)
- Any agent can use the REST API (`curl localhost:3000/api/tasks`)
- Cron jobs can auto-complete dailies and score habits
- Multiple agents can collaborate on the same board

**Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Drizzle ORM, SQLite, Docker

**Try it:**
```bash
git clone https://github.com/jvbalcita/command-center.git
cd command-center
docker compose up -d
# Open http://localhost:3000
```

**GitHub:** https://github.com/jvbalcita/command-center

Would love feedback on the agent integration approach. Is this how you'd want your AI to manage your productivity?
