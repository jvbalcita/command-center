import { describe, it, expect } from "vitest";
import {
  evaluateCondition,
  type Condition,
  type Action,
  type RuleContext,
} from "./rules";

function makeCtx(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    now: new Date("2025-01-15T12:00:00Z"), // Wednesday 12:00 UTC = 20:00 Manila
    trigger: { type: "schedule", cron: "manual" },
    db: {} as any,
    ...overrides,
  };
}

describe("evaluateCondition", () => {
  it("returns true for { type: 'always' }", () => {
    expect(evaluateCondition({ type: "always" }, makeCtx())).toBe(true);
  });

  it("returns false for { type: 'never' }", () => {
    expect(evaluateCondition({ type: "never" }, makeCtx())).toBe(false);
  });

  it("checks hour_gte correctly (Manila time)", () => {
    const ctx = makeCtx();
    // 20:00 Manila → hour_gte:18, hour_lt:23 → true
    expect(
      evaluateCondition({ type: "time_of_day", hour_gte: 18, hour_lt: 23 }, ctx)
    ).toBe(true);
    // hour_gte:0, hour_lt:10 → false
    expect(
      evaluateCondition({ type: "time_of_day", hour_gte: 0, hour_lt: 10 }, ctx)
    ).toBe(false);
  });

  it("wraps around midnight correctly", () => {
    // 02:00 UTC = 10:00 Manila → night shift 17-10 check: 10 is NOT in range [17,10)
    const ctx = makeCtx({ now: new Date("2025-01-15T02:00:00Z") });
    expect(
      evaluateCondition({ type: "time_of_day", hour_gte: 17, hour_lt: 10 }, ctx)
    ).toBe(false);
    // 01:00 UTC = 09:00 Manila → IS in range [17,10)
    const ctx2 = makeCtx({ now: new Date("2025-01-15T01:00:00Z") });
    expect(
      evaluateCondition({ type: "time_of_day", hour_gte: 17, hour_lt: 10 }, ctx2)
    ).toBe(true);
  });

  it("uses minute_gte/minute_lt filter", () => {
    // 12:35 UTC = 20:35 Manila
    const ctx = makeCtx({ now: new Date("2025-01-15T12:35:00Z") });
    expect(
      evaluateCondition(
        { type: "time_of_day", hour_gte: 20, hour_lt: 21, minute_gte: 30, minute_lt: 45 },
        ctx
      )
    ).toBe(true);
    expect(
      evaluateCondition(
        { type: "time_of_day", hour_gte: 20, hour_lt: 21, minute_gte: 0, minute_lt: 30 },
        ctx
      )
    ).toBe(false);
  });

  it("checks day_of_week correctly", () => {
    // 2025-01-15 is Wednesday (day 3)
    const ctx = makeCtx();
    expect(evaluateCondition({ type: "day_of_week", days: [1, 2, 3, 4, 5] }, ctx)).toBe(true);
    expect(evaluateCondition({ type: "day_of_week", days: [0, 6] }, ctx)).toBe(false);
  });

  it("evaluates { and: [...] }", () => {
    const ctx = makeCtx();
    expect(
      evaluateCondition(
        { and: [{ type: "day_of_week", days: [1, 2, 3, 4, 5] }, { type: "time_of_day", hour_gte: 18, hour_lt: 23 }] },
        ctx
      )
    ).toBe(true);
    expect(
      evaluateCondition(
        { and: [{ type: "day_of_week", days: [0, 6] }, { type: "time_of_day", hour_gte: 18, hour_lt: 23 }] },
        ctx
      )
    ).toBe(false);
  });

  it("evaluates { or: [...] }", () => {
    const ctx = makeCtx();
    expect(
      evaluateCondition(
        { or: [{ type: "day_of_week", days: [0, 6] }, { type: "time_of_day", hour_gte: 18, hour_lt: 23 }] },
        ctx
      )
    ).toBe(true); // time matches
    expect(
      evaluateCondition(
        { or: [{ type: "day_of_week", days: [0, 6] }, { type: "time_of_day", hour_gte: 0, hour_lt: 10 }] },
        ctx
      )
    ).toBe(false); // neither matches
  });

  it("evaluates { not: ... }", () => {
    const ctx = makeCtx();
    expect(evaluateCondition({ not: { type: "day_of_week", days: [0, 6] } }, ctx)).toBe(true);
    expect(evaluateCondition({ not: { type: "day_of_week", days: [1, 2, 3, 4, 5] } }, ctx)).toBe(false);
  });

  it("nests and/or/not arbitrarily", () => {
    const ctx = makeCtx();
    // not (weekend AND (always OR never)) → not (false AND true) → not false → true
    expect(
      evaluateCondition(
        { not: { and: [{ type: "day_of_week", days: [0, 6] }, { or: [{ type: "always" }, { type: "never" }] }] } },
        ctx
      )
    ).toBe(true);
  });

  it("passes query conditions to ctx.queryEvaluator", () => {
    const ctx = makeCtx({
      queryEvaluator: (q) => (q.table === "dailies" && (q.where as any)?.title === "test" ? [{ id: 1 }] : []),
    });
    expect(
      evaluateCondition({ type: "query", table: "dailies", where: { title: "test" }, exists: true }, ctx)
    ).toBe(true);
  });

  it("returns false for query when no evaluator is provided", () => {
    const ctx = makeCtx();
    expect(
      evaluateCondition({ type: "query", table: "dailies", where: { title: "test" }, exists: true }, ctx)
    ).toBe(false);
  });

  it("query with exists:false returns true when no rows match", () => {
    const ctx = makeCtx({
      queryEvaluator: () => [],
    });
    expect(
      evaluateCondition({ type: "query", table: "dailies", where: { title: "test" }, exists: false }, ctx)
    ).toBe(true);
  });

  it("throws on unknown condition type", () => {
    expect(() => evaluateCondition({ type: "invalid" } as any, makeCtx())).toThrow("Unknown condition type");
  });

  it("returns false for empty and/or arrays", () => {
    const ctx = makeCtx();
    expect(evaluateCondition({ and: [] }, ctx)).toBe(false);
    expect(evaluateCondition({ or: [] }, ctx)).toBe(false);
  });
});

describe("Action types", () => {
  it("Action type accepts valid action shapes", () => {
    const actions: Action[] = [
      { type: "complete_daily", dailyTitle: "Test" },
      { type: "score_habit", habitTitle: "Test", direction: "up" },
      { type: "query", sql: "SELECT 1" },
      { type: "log", message: "test" },
    ];
    expect(actions).toHaveLength(4);
  });
});
