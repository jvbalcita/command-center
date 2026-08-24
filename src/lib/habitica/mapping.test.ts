import { describe, expect, it } from "vitest";
import {
  habiticaDailyToFields,
  habiticaHabitToFields,
  habiticaRepeatToDays,
} from "./mapping";
import type { HabiticaTask } from "./types";

describe("habiticaRepeatToDays", () => {
  it("maps Habitica weekday flags to Sun–Sat indexes", () => {
    expect(
      habiticaRepeatToDays({
        su: true,
        m: true,
        t: false,
        w: false,
        th: false,
        f: true,
        s: false,
      }),
    ).toBe(JSON.stringify([0, 1, 5]));
  });

  it("returns null when repeat is missing", () => {
    expect(habiticaRepeatToDays(undefined)).toBeNull();
    expect(habiticaRepeatToDays(null)).toBeNull();
  });

  it("returns null when no weekday is selected", () => {
    expect(
      habiticaRepeatToDays({
        su: false,
        m: false,
        t: false,
        w: false,
        th: false,
        f: false,
        s: false,
      }),
    ).toBeNull();
  });
});

describe("habiticaDailyToFields", () => {
  const remote = {
    id: "d-1",
    type: "daily",
    text: "Plan Top 3",
    notes: "morning",
    priority: 1.5,
    frequency: "weekly",
    repeat: { su: false, m: true, t: true, w: true, th: true, f: true, s: false },
    startDate: "2026-01-15T00:00:00.000Z",
    everyX: 2,
    daysOfMonth: [15],
    weeksOfMonth: [],
    streak: 17,
    completed: true,
    completedAt: "2026-08-19T08:00:00.000Z",
  } as HabiticaTask;

  it("maps schedule, streak, and completion from a Habitica daily", () => {
    expect(habiticaDailyToFields(remote)).toEqual({
      title: "Plan Top 3",
      notes: "morning",
      difficulty: "medium",
      habiticaId: "d-1",
      frequency: "weekly",
      repeatDays: JSON.stringify([1, 2, 3, 4, 5]),
      startDate: new Date("2026-01-15T00:00:00.000Z"),
      everyX: 2,
      daysOfMonth: JSON.stringify([15]),
      weeksOfMonth: null,
      streak: 17,
      completedToday: true,
      lastCompletedAt: new Date("2026-08-19T08:00:00.000Z"),
    });
  });
});

describe("habiticaHabitToFields", () => {
  it("maps counters and difficulty from a Habitica habit", () => {
    const remote = {
      id: "h-1",
      type: "habit",
      text: "Read",
      notes: "",
      priority: 2,
      counterUp: 4,
      counterDown: 1,
    } as HabiticaTask;

    expect(habiticaHabitToFields(remote)).toEqual({
      title: "Read",
      notes: "",
      difficulty: "hard",
      habiticaId: "h-1",
      counterUp: 4,
      counterDown: 1,
    });
  });
});
