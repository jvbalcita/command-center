import { describe, expect, it } from "vitest";
import {
  isCompletedToday,
  isDailyDueOn,
  needsRollover,
  nextCompleteDaily,
  nextUncompleteDaily,
  parseRepeatDays,
  formatFrequency,
  mergeDailyPull,
} from "./daily-state";

const monday = new Date(2026, 7, 17, 10, 0, 0); // Aug 17 2026 is a Monday
const tuesday = new Date(2026, 7, 18, 9, 0, 0);

describe("parseRepeatDays", () => {
  it("parses a JSON weekday array", () => {
    expect(parseRepeatDays(JSON.stringify([1, 2, 5]))).toEqual([1, 2, 5]);
  });

  it("returns null for missing or invalid JSON", () => {
    expect(parseRepeatDays(null)).toBeNull();
    expect(parseRepeatDays("not-json")).toBeNull();
    expect(parseRepeatDays("{}")).toBeNull();
  });
});

describe("formatFrequency", () => {
  it("lists weekly days and capitalizes other frequencies", () => {
    expect(formatFrequency({ frequency: "weekly", repeatDays: JSON.stringify([1, 3, 5]) })).toBe(
      "Mon, Wed, Fri",
    );
    expect(formatFrequency({ frequency: "daily", repeatDays: null })).toBe("Daily");
  });
});

describe("isCompletedToday", () => {
  it("is true only when lastCompletedAt is the same local day", () => {
    expect(
      isCompletedToday(
        { completedToday: true, lastCompletedAt: monday },
        monday,
      ),
    ).toBe(true);
    expect(
      isCompletedToday(
        { completedToday: true, lastCompletedAt: monday },
        tuesday,
      ),
    ).toBe(false);
  });

  it("treats a completed flag with no timestamp as completed today", () => {
    expect(
      isCompletedToday({ completedToday: true, lastCompletedAt: null }, monday),
    ).toBe(true);
  });
});

describe("mergeDailyPull", () => {
  it("resets local completion when Habitica says not completed (Habitica reset)", () => {
    const now = monday;
    // Local says completed, remote says not completed → trust remote (Habitica reset)
    expect(
      mergeDailyPull(
        { completedToday: true, lastCompletedAt: monday, streak: 18 },
        { completedToday: false, lastCompletedAt: null, streak: 17 },
        now,
      ),
    ).toEqual({
      completedToday: false,
      lastCompletedAt: null,
      streak: 17,
    });
  });

  it("uses remote completion when both agree", () => {
    const now = monday;
    expect(
      mergeDailyPull(
        { completedToday: false, lastCompletedAt: null, streak: 0 },
        { completedToday: true, lastCompletedAt: monday, streak: 5 },
        now,
      ),
    ).toEqual({
      completedToday: true,
      lastCompletedAt: monday,
      streak: 5,
    });
  });

  it("resets stale local completion when Habitica says not completed", () => {
    // Local was completed yesterday, remote says not completed → reset
    expect(
      mergeDailyPull(
        { completedToday: true, lastCompletedAt: monday, streak: 10 },
        { completedToday: false, lastCompletedAt: null, streak: 8 },
        tuesday,
      ),
    ).toEqual({
      completedToday: false,
      lastCompletedAt: null,
      streak: 8,
    });
  });
});

describe("needsRollover", () => {
  it("is true when completedToday is stale", () => {
    expect(
      needsRollover(
        { completedToday: true, lastCompletedAt: monday },
        tuesday,
      ),
    ).toBe(true);
  });

  it("does not roll over a completed flag that has no timestamp", () => {
    expect(
      needsRollover({ completedToday: true, lastCompletedAt: null }, monday),
    ).toBe(false);
  });

  it("is false when completed today or not marked complete", () => {
    expect(
      needsRollover(
        { completedToday: true, lastCompletedAt: tuesday },
        tuesday,
      ),
    ).toBe(false);
    expect(
      needsRollover(
        { completedToday: false, lastCompletedAt: monday },
        tuesday,
      ),
    ).toBe(false);
  });
});

describe("nextCompleteDaily", () => {
  it("increments streak and stamps completion", () => {
    expect(
      nextCompleteDaily({ completedToday: false, streak: 17 }, monday),
    ).toEqual({
      completedToday: true,
      lastCompletedAt: monday,
      streak: 18,
    });
  });

  it("does not increment when already completed today", () => {
    expect(
      nextCompleteDaily(
        { completedToday: true, lastCompletedAt: monday, streak: 17 },
        monday,
      ),
    ).toBeNull();
  });

  it("increments after a stale completedToday flag (new day)", () => {
    expect(
      nextCompleteDaily(
        { completedToday: true, lastCompletedAt: monday, streak: 17 },
        tuesday,
      ),
    ).toEqual({
      completedToday: true,
      lastCompletedAt: tuesday,
      streak: 18,
    });
  });
});

describe("nextUncompleteDaily", () => {
  it("clears today and decrements streak", () => {
    expect(
      nextUncompleteDaily(
        { completedToday: true, lastCompletedAt: monday, streak: 18 },
        monday,
      ),
    ).toEqual({
      completedToday: false,
      streak: 17,
    });
  });

  it("does not decrement when not completed today", () => {
    expect(
      nextUncompleteDaily(
        { completedToday: false, lastCompletedAt: monday, streak: 17 },
        tuesday,
      ),
    ).toBeNull();
  });
});

describe("isDailyDueOn", () => {
  it("is due on selected weekdays only", () => {
    const daily = {
      frequency: "weekly" as const,
      repeatDays: JSON.stringify([1, 3, 5]),
      startDate: null,
    };
    expect(isDailyDueOn(daily, monday)).toBe(true);
    expect(isDailyDueOn(daily, tuesday)).toBe(false);
  });

  it("is due every day when frequency is daily", () => {
    expect(
      isDailyDueOn(
        { frequency: "daily", repeatDays: null, startDate: null },
        monday,
      ),
    ).toBe(true);
  });

  it("respects everyX for daily interval from startDate", () => {
    const start = new Date(2026, 7, 17); // Monday
    const daily = {
      frequency: "daily" as const,
      repeatDays: null,
      startDate: start,
      everyX: 2,
    };
    expect(isDailyDueOn(daily, start)).toBe(true);
    expect(isDailyDueOn(daily, new Date(2026, 7, 18))).toBe(false);
    expect(isDailyDueOn(daily, new Date(2026, 7, 19))).toBe(true);
  });

  it("respects everyX weeks on matching weekdays", () => {
    const start = new Date(2026, 7, 17); // Monday
    const daily = {
      frequency: "weekly" as const,
      repeatDays: JSON.stringify([1]),
      startDate: start,
      everyX: 2,
    };
    expect(isDailyDueOn(daily, start)).toBe(true);
    expect(isDailyDueOn(daily, new Date(2026, 7, 24))).toBe(false);
    expect(isDailyDueOn(daily, new Date(2026, 7, 31))).toBe(true);
  });

  it("is due on selected days of the month", () => {
    const daily = {
      frequency: "monthly" as const,
      repeatDays: null,
      startDate: new Date(2026, 0, 15),
      everyX: 1,
      daysOfMonth: [15],
    };
    expect(isDailyDueOn(daily, new Date(2026, 7, 15))).toBe(true);
    expect(isDailyDueOn(daily, new Date(2026, 7, 16))).toBe(false);
  });

  it("is due on a week-of-month weekday", () => {
    const daily = {
      frequency: "monthly" as const,
      repeatDays: JSON.stringify([2]), // Tuesday
      startDate: new Date(2026, 7, 1),
      everyX: 1,
      weeksOfMonth: [1], // 2nd week (0-indexed)
    };
    // 2nd Tuesday of Aug 2026 is Aug 11
    expect(isDailyDueOn(daily, new Date(2026, 7, 11))).toBe(true);
    expect(isDailyDueOn(daily, new Date(2026, 7, 4))).toBe(false);
    expect(isDailyDueOn(daily, new Date(2026, 7, 18))).toBe(false);
  });

  it("is due yearly on the start date month and day", () => {
    const daily = {
      frequency: "yearly" as const,
      repeatDays: null,
      startDate: new Date(2024, 7, 19),
      everyX: 1,
    };
    expect(isDailyDueOn(daily, new Date(2026, 7, 19))).toBe(true);
    expect(isDailyDueOn(daily, new Date(2026, 7, 18))).toBe(false);
  });

  it("is not due before startDate", () => {
    expect(
      isDailyDueOn(
        {
          frequency: "daily",
          repeatDays: null,
          startDate: tuesday,
        },
        monday,
      ),
    ).toBe(false);
  });
});
