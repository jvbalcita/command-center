import { describe, expect, it, vi } from "vitest";
import type { HabiticaClient } from "./client";
import { mapPriority, pushTask } from "./sync";

describe("mapPriority", () => {
  it("maps local priorities to Habitica numbers", () => {
    expect(mapPriority("low")).toBe(1);
    expect(mapPriority("medium")).toBe(1.5);
    expect(mapPriority("high")).toBe(2);
  });
});

describe("pushTask", () => {
  it("creates a Habitica task when there is no habiticaId", async () => {
    const createTask = vi.fn(async () => ({ id: "h-1", type: "todo" as const }));
    const updateTask = vi.fn();
    const client = { createTask, updateTask } as unknown as HabiticaClient;

    const result = await pushTask(client, {
      id: 1,
      title: "Write docs",
      notes: null,
      priority: "high",
      status: "todo",
      habiticaId: null,
      habiticaType: null,
    });

    expect(result).toEqual({ habiticaId: "h-1", habiticaType: "todo", created: true });
    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Write docs", type: "todo", priority: 2 }),
    );
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("updates when a habiticaId already exists (idempotent — no duplicates)", async () => {
    const createTask = vi.fn();
    const updateTask = vi.fn(async () => ({ id: "h-9", type: "todo" as const }));
    const client = { createTask, updateTask } as unknown as HabiticaClient;

    const result = await pushTask(client, {
      id: 2,
      title: "Existing task",
      notes: "n",
      priority: "low",
      status: "todo",
      habiticaId: "h-9",
      habiticaType: "todo",
    });

    expect(result).toEqual({ habiticaId: "h-9", habiticaType: "todo", created: false });
    expect(updateTask).toHaveBeenCalledWith(
      "h-9",
      expect.objectContaining({ text: "Existing task" }),
    );
    expect(createTask).not.toHaveBeenCalled();
  });
});
