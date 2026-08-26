import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  },
}));

// Mock the queries module
vi.mock("@/lib/db/queries", () => ({
  getTask: vi.fn(),
  listSubtasks: vi.fn(),
  updateSubtask: vi.fn(),
  logActivity: vi.fn(),
}));

// Mock Habitica service
vi.mock("@/lib/habitica/service", () => ({
  getHabiticaClient: vi.fn(),
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("toggleSubtaskAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toggles subtask from incomplete to complete and syncs to Habitica", async () => {
    const { getTask, listSubtasks, updateSubtask, logActivity } = await import("@/lib/db/queries");
    const { getHabiticaClient } = await import("@/lib/habitica/service");

    // Current subtask is incomplete (completed: false)
    // First call: read current state to determine toggle direction
    // Second call: get full checklist after update
    listSubtasks
      .mockResolvedValueOnce([
        { id: 10, taskId: 1, title: "Sub 1", completed: false, position: 0 },
        { id: 11, taskId: 1, title: "Sub 2", completed: true, position: 1 },
      ])
      .mockResolvedValueOnce([
        { id: 10, taskId: 1, title: "Sub 1", completed: true, position: 0 },
        { id: 11, taskId: 1, title: "Sub 2", completed: true, position: 1 },
      ]);
    // updateSubtask returns the updated record
    updateSubtask.mockResolvedValue({ id: 10, taskId: 1, title: "Sub 1", completed: true });
    getTask.mockResolvedValue({ id: 1, title: "Test Task", habiticaId: "hab-123" });

    const mockClient = { updateTask: vi.fn().mockResolvedValue({}) };
    getHabiticaClient.mockResolvedValue(mockClient);

    const { toggleSubtaskAction } = await import("@/lib/actions");
    const result = await toggleSubtaskAction(10);

    expect(result.ok).toBe(true);
    // Should toggle from false → true
    expect(updateSubtask).toHaveBeenCalledWith(10, { completed: true });
    // Should sync full checklist to Habitica
    expect(mockClient.updateTask).toHaveBeenCalledWith("hab-123", {
      checklist: [
        { text: "Sub 1", completed: true },
        { text: "Sub 2", completed: true },
      ],
    });
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "subtask_toggled" })
    );
  });

  it("toggles subtask from complete to incomplete", async () => {
    const { getTask, listSubtasks, updateSubtask } = await import("@/lib/db/queries");
    const { getHabiticaClient } = await import("@/lib/habitica/service");

    // Current subtask is complete (completed: true)
    listSubtasks.mockResolvedValue([
      { id: 10, taskId: 1, title: "Sub 1", completed: true, position: 0 },
    ]);
    updateSubtask.mockResolvedValue({ id: 10, taskId: 1, title: "Sub 1", completed: false });
    getTask.mockResolvedValue({ id: 1, title: "Test Task", habiticaId: "hab-123" });

    const mockClient = { updateTask: vi.fn().mockResolvedValue({}) };
    getHabiticaClient.mockResolvedValue(mockClient);

    const { toggleSubtaskAction } = await import("@/lib/actions");
    const result = await toggleSubtaskAction(10);

    expect(result.ok).toBe(true);
    expect(updateSubtask).toHaveBeenCalledWith(10, { completed: false });
  });

  it("returns error when subtask not found", async () => {
    const { updateSubtask } = await import("@/lib/db/queries");
    updateSubtask.mockResolvedValue(null);

    const { toggleSubtaskAction } = await import("@/lib/actions");
    const result = await toggleSubtaskAction(999);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("returns error when Habitica sync fails", async () => {
    const { getTask, listSubtasks, updateSubtask } = await import("@/lib/db/queries");
    const { getHabiticaClient } = await import("@/lib/habitica/service");

    listSubtasks.mockResolvedValue([
      { id: 10, taskId: 1, title: "Sub", completed: false, position: 0 },
    ]);
    updateSubtask.mockResolvedValue({ id: 10, taskId: 1, title: "Sub", completed: true });
    getTask.mockResolvedValue({ id: 1, title: "Test", habiticaId: "hab-123" });

    const mockClient = { updateTask: vi.fn().mockRejectedValue(new Error("API down")) };
    getHabiticaClient.mockResolvedValue(mockClient);

    const { toggleSubtaskAction } = await import("@/lib/actions");
    const result = await toggleSubtaskAction(10);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("API down");
  });

  it("succeeds without Habitica when task has no habiticaId", async () => {
    const { getTask, listSubtasks, updateSubtask, logActivity } = await import("@/lib/db/queries");

    listSubtasks.mockResolvedValue([
      { id: 10, taskId: 1, title: "Sub", completed: false, position: 0 },
    ]);
    updateSubtask.mockResolvedValue({ id: 10, taskId: 1, title: "Sub", completed: true });
    getTask.mockResolvedValue({ id: 1, title: "Local Task", habiticaId: null });

    const { toggleSubtaskAction } = await import("@/lib/actions");
    const result = await toggleSubtaskAction(10);

    expect(result.ok).toBe(true);
    expect(logActivity).toHaveBeenCalled();
  });
});
