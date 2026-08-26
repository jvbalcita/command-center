# Command Center REST API

## Authentication

All `/api/*` routes are protected by the middleware in `src/middleware.ts`.

### Localhost mode (default)
When `API_SECRET` is not set, only localhost requests are allowed (127.0.0.1 / ::1).

```bash
curl http://localhost:3001/api/tasks
```

### Token mode
When `API_SECRET` is set, include it as a Bearer token:

```bash
curl -H "Authorization: Bearer $API_SECRET" http://localhost:3001/api/tasks
```

Generate a secure token: `openssl rand -hex 32`

## Response Format

All endpoints return JSON with a consistent shape:

```json
{
  "ok": true,
  "data": { ... }
}
```

On error:

```json
{
  "ok": false,
  "error": "Description of what went wrong"
}
```

## Endpoints

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (filterable) |
| POST | `/api/tasks` | Create a task |
| GET | `/api/tasks/:id` | Get task detail |
| POST | `/api/tasks/:id/complete` | Toggle completion |

#### GET /api/tasks

Query parameters:
- `project` (number) — Filter by project ID
- `status` (string) — Filter by status: `todo`, `in_progress`, `done`
- `includeArchived` (boolean) — Include archived tasks

#### POST /api/tasks

Body:
```json
{
  "title": "Ship feature X",
  "notes": "Implement the new dashboard",
  "priority": "high",
  "difficulty": "hard",
  "dueDate": "2025-12-31",
  "projectId": 1,
  "subtasks": [
    { "title": "Design mockups", "completed": false },
    { "title": "Implement backend", "completed": false }
  ]
}
```

Returns: The created task (201)

#### POST /api/tasks/:id/complete

No body needed. Toggles the task between done/todo states. Triggers Habitica sync, automation rules, and activity logging.

### Dailies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dailies` | List all dailies |
| POST | `/api/dailies/:id/complete` | Complete a daily |

#### POST /api/dailies/:id/complete

No body needed. Marks the daily as completed and syncs to Habitica.

### Habits

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/habits` | List all habits |
| POST | `/api/habits/:id/score` | Score a habit |

#### POST /api/habits/:id/score

Body:
```json
{
  "direction": "up"
}
```

### Activity

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/activity` | List recent activity |

Query parameters:
- `limit` (number) — Max items to return (default: 25)

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Dashboard statistics |

Returns aggregated stats: open tasks, completed today, habits, dailies, streaks.
