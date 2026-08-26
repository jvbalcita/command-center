import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database layer
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/db/queries", () => ({
  listTasks: vi.fn().mockResolvedValue([]),
  getTask: vi.fn(),
  createTask: vi.fn(),
  createSubtask: vi.fn(),
  completeTask: vi.fn(),
  reopenTask: vi.fn(),
  logActivity: vi.fn(),
  listDailies: vi.fn().mockResolvedValue([]),
  listHabits: vi.fn().mockResolvedValue([]),
  listActivity: vi.fn().mockResolvedValue([]),
  getHabit: vi.fn(),
  getDaily: vi.fn(),
}));

vi.mock("@/lib/habitica/service", () => ({
  enqueueTaskSync: vi.fn(),
  getHabiticaClient: vi.fn(),
}));

vi.mock("@/lib/actions", () => ({
  createTaskAction: vi.fn(),
  toggleTaskCompleteAction: vi.fn(),
  completeDailyAction: vi.fn(),
  scoreHabitAction: vi.fn(),
}));

describe("API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/tasks", () => {
    it("returns tasks list", async () => {
      const { listTasks } = await import("@/lib/db/queries");
      listTasks.mockResolvedValue([
        { id: 1, title: "Test Task", status: "todo" },
      ]);

      const { GET } = await import("@/app/api/tasks/route");
      const req = new Request("http://localhost/api/tasks");
      const res = await GET(req as any);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.data).toHaveLength(1);
    });

    it("passes filter params correctly", async () => {
      const { listTasks } = await import("@/lib/db/queries");
      listTasks.mockResolvedValue([]);

      const { GET } = await import("@/app/api/tasks/route");
      const req = new Request("http://localhost/api/tasks?project=1&status=done");
      const res = await GET(req as any);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(listTasks).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 1, status: "done" })
      );
    });
  });

  describe("POST /api/tasks", () => {
    it("creates a task with valid data", async () => {
      const { createTask, logActivity } = await import("@/lib/db/queries");
      const { enqueueTaskSync } = await import("@/lib/habitica/service");
      createTask.mockResolvedValue({ id: 1, title: "New Task", status: "todo" });

      const { POST } = await import("@/app/api/tasks/route");
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Task" }),
      });
      const res = await POST(req as any);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.ok).toBe(true);
      expect(data.data.title).toBe("New Task");
      expect(logActivity).toHaveBeenCalled();
      expect(enqueueTaskSync).toHaveBeenCalled();
    });

    it("returns 400 for missing title", async () => {
      const { POST } = await import("@/app/api/tasks/route");
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "no title" }),
      });
      const res = await POST(req as any);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.ok).toBe(false);
    });
  });

  describe("POST /api/tasks/:id/complete", () => {
    it("toggles task completion", async () => {
      const { getTask, completeTask, logActivity } = await import("@/lib/db/queries");
      const { enqueueTaskSync } = await import("@/lib/habitica/service");
      getTask.mockResolvedValue({ id: 1, title: "Task", status: "todo" });
      completeTask.mockResolvedValue({ id: 1, status: "done" });

      const { POST } = await import("@/app/api/tasks/[id]/complete/route");
      const req = new Request("http://localhost/api/tasks/1/complete", { method: "POST" });
      const res = await POST(req as any, { params: Promise.resolve({ id: "1" }) });
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(completeTask).toHaveBeenCalledWith(1);
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({ type: "task_completed" })
      );
    });

    it("returns 404 for unknown task", async () => {
      const { getTask } = await import("@/lib/db/queries");
      getTask.mockResolvedValue(null);

      const { POST } = await import("@/app/api/tasks/[id]/complete/route");
      const req = new Request("http://localhost/api/tasks/999/complete", { method: "POST" });
      const res = await POST(req as any, { params: Promise.resolve({ id: "999" }) });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.ok).toBe(false);
    });
  });

  describe("GET /api/dailies", () => {
    it("returns dailies list", async () => {
      const { listDailies } = await import("@/lib/db/queries");
      listDailies.mockResolvedValue([{ id: 1, title: "Daily" }]);

      const { GET } = await import("@/app/api/dailies/route");
      const req = new Request("http://localhost/api/dailies");
      const res = await GET(req as any);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.data).toHaveLength(1);
    });
  });

  describe("POST /api/habits/:id/score", () => {
    it("scores a habit up", async () => {
      const { getHabit, logActivity } = await import("@/lib/db/queries");
      const { scoreHabitAction } = await import("@/lib/actions");
      getHabit.mockResolvedValue({ id: 1, title: "Habit" });
      scoreHabitAction.mockResolvedValue({ success: true });

      const { POST } = await import("@/app/api/habits/[id]/score/route");
      const req = new Request("http://localhost/api/habits/1/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "up" }),
      });
      const res = await POST(req as any, { params: Promise.resolve({ id: "1" }) });
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(scoreHabitAction).toHaveBeenCalledWith(1, "up");
    });

    it("returns 400 for invalid direction", async () => {
      const { POST } = await import("@/app/api/habits/[id]/score/route");
      const req = new Request("http://localhost/api/habits/1/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "sideways" }),
      });
      const res = await POST(req as any, { params: Promise.resolve({ id: "1" }) });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.ok).toBe(false);
    });
  });

  describe("GET /api/stats", () => {
    it("returns dashboard stats", async () => {
      const { GET } = await import("@/app/api/stats/route");
      const req = new Request("http://localhost/api/stats");
      const res = await GET(req as any);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.data).toHaveProperty("openTasks");
      expect(data.data).toHaveProperty("totalHabits");
    });
  });
});
