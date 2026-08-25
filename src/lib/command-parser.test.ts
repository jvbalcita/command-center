import { describe, expect, it } from "vitest";
import { parseCommand, parseDue } from "./command-parser";

const projects = [
  { id: 1, name: "Mission Control" },
  { id: 2, name: "Personal" },
];

describe("parseDue", () => {
  it("parses explicit dates", () => {
    expect(parseDue("2026-12-25")).toBe("2026-12-25");
    expect(parseDue("2026/1/5")).toBe("2026-01-05");
  });
  it("parses relative days", () => {
    expect(parseDue("today")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parseDue("tomorrow")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parseDue("in 3 days")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("parseCommand", () => {
  it("parses project + priority + due", () => {
    const r = parseCommand("Ship login @Personal #high due:tomorrow", projects);
    expect(r.title).toBe("Ship login");
    expect(r.projectId).toBe(2);
    expect(r.priority).toBe("high");
    expect(r.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("strips an unmatched @token and reports the name", () => {
    const r = parseCommand("Launch Shipped @noway, , and", projects);
    expect(r.title).toBe("Launch Shipped");
    expect(r.projectId).toBeUndefined();
    expect(r.projectError).toBe("noway");
  });

  it("prefix-matches a unique project and treats hyphens like spaces", () => {
    const r = parseCommand("Ship login @mission-control #high", projects);
    expect(r.title).toBe("Ship login");
    expect(r.projectId).toBe(1);
    expect(r.projectError).toBeUndefined();
    expect(r.priority).toBe("high");
  });

  it("does not guess when the prefix is ambiguous", () => {
    const many = [
      ...projects,
      { id: 3, name: "Mission Ops" },
    ];
    const r = parseCommand("Ship login @mission", many);
    expect(r.title).toBe("Ship login");
    expect(r.projectId).toBeUndefined();
    expect(r.projectError).toBe("mission");
  });

  it("keeps 'and' inside the real title", () => {
    const r = parseCommand("Buy milk and eggs @noway", projects);
    expect(r.title).toBe("Buy milk and eggs");
    expect(r.projectError).toBe("noway");
  });

  it("defaults to plain title", () => {
    const r = parseCommand("Just a task", projects);
    expect(r.title).toBe("Just a task");
    expect(r.projectId).toBeUndefined();
    expect(r.priority).toBeUndefined();
    expect(r.dueDate).toBeUndefined();
  });

  it("matches project case-insensitively", () => {
    const r = parseCommand("Call mom @personal", projects);
    expect(r.projectId).toBe(2);
    expect(r.title).toBe("Call mom");
  });
});
