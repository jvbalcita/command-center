import { describe, expect, it } from "vitest";
import { moveItem, parseRoutineDragId, routineDragId } from "./reorder";

describe("moveItem", () => {
  const items = [{ id: 1 }, { id: 2 }, { id: 3 }];

  it("reorders within a list", () => {
    expect(moveItem(items, 1, 3).map((item) => item.id)).toEqual([2, 3, 1]);
  });

  it("returns the same list when ids are missing or unchanged", () => {
    expect(moveItem(items, 1, 1)).toBe(items);
    expect(moveItem(items, 9, 1)).toBe(items);
  });
});

describe("routine drag ids", () => {
  it("round-trips habit and daily ids", () => {
    expect(parseRoutineDragId(routineDragId("habit", 12))).toEqual({ kind: "habit", id: 12 });
    expect(parseRoutineDragId(routineDragId("daily", 4))).toEqual({ kind: "daily", id: 4 });
    expect(parseRoutineDragId("todo-1")).toBeNull();
  });
});
