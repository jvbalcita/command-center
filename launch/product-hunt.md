# Product Hunt Launch

## Tagline
Local-first personal ops app with Habitica sync and AI agent support

## Description

Command Center is a local-first personal operations app for developers who want to own their productivity stack.

**Why Product Hunt?**
Most productivity apps are cloud-first and closed. Command Center is:
- **Local-first** – SQLite on your machine, no cloud dependency
- **Agent-agnostic** – Any AI agent can manage your tasks via REST API
- **Habitica-native** – Two-way sync for RPG-style gamification
- **Open source** – MIT licensed, self-hostable

**Key Features:**
1. Kanban task management with projects, priorities, and due dates
2. Habit tracking with up/down scoring and streaks
3. Daily routines with frequency scheduling
4. Two-way Habitica sync (tasks, habits, dailies)
5. REST API for programmatic access
6. Docker one-command deployment

**The Agent Angle:**
Command Center is built for AI agents. Any agent that can make HTTP requests can:
- Create, update, complete tasks via REST API
- Score habits and complete dailies
- Run automation rules on schedule
- Collaborate with other agents on the same board

**Quick Start:**
```bash
git clone https://github.com/jvbalcita/command-center.git
cd command-center
docker compose up -d
# Open http://localhost:3000
```

**GitHub:** https://github.com/jvbalcita/command-center

## Maker Comment

Hey Product Hunt! 👋

I built Command Center because I wanted my AI agent to manage my tasks while I sleep. Most productivity apps are cloud-first and closed – I wanted something local-first, API-first, and agent-friendly.

The key insight: if your productivity app has a REST API, any AI agent can manage your workflow. Hermes Agent uses it via CLI, but Claude, GPT, or any HTTP-capable agent can too.

Would love feedback from the PH community! 🚀

## Topics
- Productivity
- Open Source
- Artificial Intelligence
- Developer Tools
- Self-Hosted

## Thumbnail
(Use logo.svg from public/ directory)
