import { describe, expect, it } from "vitest";
import { parseMcArgs } from "./mc-cli";

describe("parseMcArgs", () => {
  it("parses add with notes, priority, project, and subtasks", () => {
    expect(
      parseMcArgs([
        "add",
        "Daily reminders",
        "-n",
        "Surface due dailies",
        "-p",
        "high",
        "--project",
        "Mission Control",
        "--sub",
        "Sidebar badge",
        "--sub",
        "Missed check",
      ]),
    ).toEqual({
      name: "add",
      title: "Daily reminders",
      notes: "Surface due dailies",
      priority: "high",
      project: "Mission Control",
      subs: ["Sidebar badge", "Missed check"],
    });
  });

  it("parses list --inbox", () => {
    expect(parseMcArgs(["list", "--inbox", "--status", "todo"])).toEqual({
      name: "list",
      status: "todo",
      project: undefined,
      inbox: true,
      json: false,
    });
  });

  it("parses assign to inbox", () => {
    expect(parseMcArgs(["assign", "14", "inbox"])).toEqual({
      name: "assign",
      id: 14,
      project: "inbox",
    });
  });

  it("parses sub done by title", () => {
    expect(parseMcArgs(["sub", "done", "22", "Sidebar badge"])).toEqual({
      name: "sub-done",
      id: 22,
      sub: "Sidebar badge",
    });
  });
});
