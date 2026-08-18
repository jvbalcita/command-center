import { describe, expect, it, vi } from "vitest";
import type { HabiticaClient } from "./client";
import { pushTask } from "./sync";
import { difficultyToHabiticaPriority } from "./mapping";

describe("difficultyToHabiticaPriority", () => {
  it("maps Mission Control difficulty to Habitica priority numbers", () => {
    expect(difficultyToHabiticaPriority("trivial")).toBe(0.1);
    expect(difficultyToHabiticaPriority("easy")).toBe(1);
    expect(difficultyToHabiticaPriority("medium")).toBe(1.5);
    expect(difficultyToHabiticaPriority("hard")).toBe(2);
  });
});

describe("pushTask", () => {
  it("creates a Habitica task with difficulty → priority + checklist", async () => {
    const createTask = vi.fn(async () => ({ id: "h-1", type: "todo" as const }));
    const updateTask = vi.fn();
    const client = { createTask, updateTask } as unknown as HabiticaClient;

    const result = await pushTask(client, {
      id: 1,
      title: "Write docs",
      notes: null,
      difficulty: "hard",
      checklist: [
        { title: "outline", completed: true },
        { title: "draft", completed: false },
      ],
      status: "todo",
      habiticaId: null,
      habiticaType: null,
    });

    expect(result).toEqual({ habiticaId: "h-1", habiticaType: "todo", created: true });
    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Write docs",
        type: "todo",
        priority: 2,
        checklist: [
          { text: "outline", completed: true },
          { text: "draft", completed: false },
        ],
      }),
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
      difficulty: "easy",
      checklist: [],
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
