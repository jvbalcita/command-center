# Command Center

A personal operations app — tasks, habits, dailies, and automation — with Habitica sync.

![Command Center](docs/screenshot.png)

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/your-username/command-center.git
cd command-center
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000). That's it.

### Manual Setup

```bash
git clone https://github.com/your-username/command-center.git
cd command-center
npm install
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Kanban Board** — Drag-and-drop task management with projects, priorities, and due dates
- **Habits & Dailies** — Track habits with scoring, dailies with streaks and scheduling
- **Habitica Sync** — Two-way sync with Habitica for tasks, habits, and dailies
- **Automation Rules** — Time-based and event-triggered rules (auto-complete, auto-score)
- **Dashboard** — Activity feed, stats, and Habitica character stats
- **REST API** — Full API for external tools (Hermes, cron jobs, git hooks)
- **Command Bar** — Quick task creation with natural language parsing

## REST API

Command Center exposes a REST API for programmatic access. See [docs/api.md](docs/api.md) for the full reference.

### Quick Examples

```bash
# List tasks
curl http://localhost:3000/api/tasks

# Create a task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Ship feature X", "priority": "high"}'

# Complete a task
curl -X POST http://localhost:3000/api/tasks/1/complete

# Get dashboard stats
curl http://localhost:3000/api/stats
```

### Authentication

By default, API routes are restricted to localhost. To enable remote access:

```bash
# Generate a secret
openssl rand -hex 32

# Set it in .env or docker-compose.yml
API_SECRET=your-generated-secret

# Use it in requests
curl -H "Authorization: Bearer your-generated-secret" http://localhost:3000/api/tasks
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database path | `./data/mission-control.db` |
| `API_SECRET` | Bearer token for API auth | (localhost-only) |
| `HABITICA_USER_ID` | Habitica user ID | — |
| `HABITICA_API_TOKEN` | Habitica API token | — |

See [`.env.example`](.env.example) for the full template.

## Project Structure

```
src/
├── app/
│   ├── api/           # REST API routes
│   ├── automation/    # Automation rules page
│   └── page.tsx       # Main kanban board
├── components/        # Shared UI components
├── hooks/             # Custom React hooks
└── lib/
    ├── automation/    # Rule engine & actions
    ├── db/            # Database schema & queries
    ├── habitica/      # Habitica API client & sync
    └── actions.ts     # Server actions
```

## Tech Stack

- **Next.js 16** — React framework with App Router
- **React 19** — UI library
- **TypeScript** — Type safety
- **Tailwind CSS 4** — Styling
- **shadcn/ui** — Component library
- **Drizzle ORM** — Database ORM
- **SQLite** (better-sqlite3) — Local database
- **Zod** — Schema validation

## Development

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run typecheck    # Type check
npm run lint         # Lint
npm run db:push      # Push schema changes
npm run db:studio    # Open Drizzle Studio
```

## Contributing

Contributions welcome! Please read the contribution guidelines before submitting a PR.

## License

MIT
