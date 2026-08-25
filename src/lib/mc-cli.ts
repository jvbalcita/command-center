export type McCommand =
  | { name: "help" }
  | { name: "list"; status?: "todo" | "in_progress" | "done"; project?: string; inbox: boolean; json: boolean }
  | { name: "show"; id: number }
  | { name: "add"; title: string; notes?: string; priority: "low" | "medium" | "high"; project?: string; subs: string[] }
  | { name: "assign"; id: number; project: string }
  | { name: "done"; id: number }
  | { name: "reopen"; id: number }
  | { name: "move"; id: number; status: "todo" | "in_progress" | "done" }
  | { name: "note"; id: number; notes: string }
  | { name: "sub-add"; id: number; title: string }
  | { name: "sub-done"; id: number; sub: string }
  | { name: "daily-list"; json: boolean }
  | { name: "daily-done"; needle: string }
  | { name: "habit-score"; needle: string; direction: "up" | "down" };

const STATUSES = new Set(["todo", "in_progress", "done"]);
const PRIORITIES = new Set(["low", "medium", "high"]);

function takeFlag(args: string[], name: string): boolean {
  const i = args.indexOf(name);
  if (i < 0) return false;
  args.splice(i, 1);
  return true;
}

function takeOption(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const value = args[i + 1];
  if (!value || value.startsWith("-")) return undefined;
  args.splice(i, 2);
  return value;
}

function takeRepeat(args: string[], name: string): string[] {
  const out: string[] = [];
  let value = takeOption(args, name);
  while (value) {
    out.push(value);
    value = takeOption(args, name);
  }
  return out;
}

export function parseMcArgs(argv: string[]): McCommand {
  const args = argv.slice();
  const cmd = args.shift() ?? "help";

  if (cmd === "help" || cmd === "-h" || cmd === "--help") return { name: "help" };

  if (cmd === "list") {
    const statusRaw = takeOption(args, "--status");
    if (statusRaw && !STATUSES.has(statusRaw)) throw new Error(`Unknown status: ${statusRaw}`);
    return {
      name: "list",
      status: statusRaw as "todo" | "in_progress" | "done" | undefined,
      project: takeOption(args, "--project"),
      inbox: takeFlag(args, "--inbox"),
      json: takeFlag(args, "--json"),
    };
  }

  if (cmd === "show") {
    const id = Number(args[0]);
    if (!id) throw new Error("show requires a task id");
    return { name: "show", id };
  }

  if (cmd === "add") {
    const notes = takeOption(args, "-n") ?? takeOption(args, "--notes");
    const priority = takeOption(args, "-p") ?? takeOption(args, "--priority") ?? "medium";
    const project = takeOption(args, "--project");
    const subs = [...takeRepeat(args, "--sub"), ...takeRepeat(args, "-s")];
    const title = args.filter((a) => !a.startsWith("-")).join(" ").trim();
    if (!title) throw new Error("add requires a title");
    if (!PRIORITIES.has(priority)) throw new Error(`Unknown priority: ${priority}`);
    return { name: "add", title, notes, priority: priority as "low" | "medium" | "high", project, subs };
  }

  if (cmd === "assign") {
    const id = Number(args[0]);
    const project = args.slice(1).join(" ").trim();
    if (!id || !project) throw new Error("assign requires <id> <project|inbox>");
    return { name: "assign", id, project };
  }

  if (cmd === "done" || cmd === "reopen") {
    const id = Number(args[0]);
    if (!id) throw new Error(`${cmd} requires a task id`);
    return { name: cmd, id };
  }

  if (cmd === "move") {
    const id = Number(args[0]);
    const status = args[1];
    if (!id || !status || !STATUSES.has(status)) {
      throw new Error("move requires <id> todo|in_progress|done");
    }
    return { name: "move", id, status: status as "todo" | "in_progress" | "done" };
  }

  if (cmd === "note") {
    const id = Number(args[0]);
    const notes = args.slice(1).join(" ").trim();
    if (!id || !notes) throw new Error("note requires <id> <text>");
    return { name: "note", id, notes };
  }

  if (cmd === "sub") {
    const action = args.shift();
    const id = Number(args[0]);
    const rest = args.slice(1).join(" ").trim();
    if (action === "add") {
      if (!id || !rest) throw new Error("sub add requires <taskId> <title>");
      return { name: "sub-add", id, title: rest };
    }
    if (action === "done") {
      if (!id || !rest) throw new Error("sub done requires <taskId> <subId|title>");
      return { name: "sub-done", id, sub: rest };
    }
    throw new Error("sub requires add|done");
  }

  if (cmd === "daily") {
    const action = args.shift();
    if (action === "list") return { name: "daily-list", json: takeFlag(args, "--json") };
    if (action === "done") {
      const needle = args.join(" ").trim();
      if (!needle) throw new Error("daily done requires an id or title");
      return { name: "daily-done", needle };
    }
    throw new Error("daily requires list|done");
  }

  if (cmd === "habit") {
    const action = args.shift();
    if (action !== "score") throw new Error("habit requires score");
    const direction = args.find((a) => a === "up" || a === "down") as "up" | "down" | undefined;
    const needle = args.filter((a) => a !== "up" && a !== "down").join(" ").trim();
    if (!needle || !direction) throw new Error("habit score requires <id|title> up|down");
    return { name: "habit-score", needle, direction };
  }

  throw new Error(`Unknown command: ${cmd}`);
}

export const MC_HELP = `Mission Control CLI — agents use this instead of seed scripts.

  npm run mc -- list [--status todo|in_progress|done] [--project Name|--inbox] [--json]
  npm run mc -- show <id>
  npm run mc -- add "Title" [-n "notes"] [-p high|medium|low] [--project Name] [--sub "item"]
  npm run mc -- assign <id> <project|inbox>
  npm run mc -- done <id>
  npm run mc -- reopen <id>
  npm run mc -- move <id> todo|in_progress|done
  npm run mc -- note <id> "updated description"
  npm run mc -- sub add <id> "subtask title"
  npm run mc -- sub done <id> <subId|title>
  npm run mc -- daily list [--json]
  npm run mc -- daily done <id|title>
  npm run mc -- habit score <id|title> up|down
`;
