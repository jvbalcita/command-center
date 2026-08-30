# Reddit Launch Posts

## r/selfhosted

**Title:** Command Center – Local-first personal ops app with Habitica sync and AI agent support

**Post:**

I built Command Center – a local-first personal operations app for developers who want to own their productivity stack.

**Features:**
- Kanban task management with projects, priorities, and due dates
- Habit tracking with up/down scoring and streaks
- Daily routines with frequency scheduling
- Two-way Habitica sync (tasks, habits, dailies)
- REST API for programmatic access
- Docker one-command deployment

**What makes it different:**
- **Local-first** – SQLite on your machine, no cloud dependency
- **Agent-agnostic** – Any AI agent can manage your tasks via REST API or CLI
- **Habitica-native** – Two-way sync for RPG-style gamification
- **Open source** – MIT licensed, self-hostable

**Quick start:**
```bash
git clone https://github.com/jvbalcita/command-center.git
cd command-center
docker compose up -d
# Open http://localhost:3000
```

**GitHub:** https://github.com/jvbalcita/command-center

Would love feedback from the self-hosted community!

---

## r/habitica

**Title:** Command Center – Local-first app with two-way Habitica sync

**Post:**

Hey Habitica community!

I built Command Center – a local-first personal operations app that syncs two-way with Habitica.

**What it does:**
- Kanban task management with projects and priorities
- Habit tracking with scoring (syncs to Habitica)
- Daily routines with frequency scheduling and streaks
- Dashboard with Habitica stats (level, XP, gold)
- Two-way sync – create in Command Center, appears in Habitica (and vice versa)

**Why I built it:**
I wanted a local-first app that could:
1. Manage my tasks without cloud dependency
2. Sync with Habitica for gamification
3. Let my AI agent manage my productivity stack

**The Habitica integration:**
- Tasks created here sync to Habitica automatically
- Completing tasks awards XP/GP
- Habits can be scored up/down (syncs to Habitica)
- Dailies track streaks and frequency
- Import existing Habitica data

**Quick start:**
```bash
git clone https://github.com/jvbalcita/command-center.git
cd command-center
cp .env.example .env
# Add your Habitica User ID and API Token to .env
docker compose up -d
# Open http://localhost:3000
```

**GitHub:** https://github.com/jvbalcita/command-center

Would love to hear what the Habitica community thinks!
