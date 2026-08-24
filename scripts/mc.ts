import {
  completeDaily,
  completeTask,
  createSubtask,
  createTask,
  getTask,
  incrementHabitCounter,
  listDailies,
  listHabits,
  listProjects,
  listSubtasks,
  listTasks,
  logActivity,
  reopenTask,
  setTaskStatus,
  updateSubtask,
  updateTask,
} from "../src/lib/db/queries";
import { formatFrequency, isCompletedToday, isDailyDueOn } from "../src/lib/daily-state";
import {
  completeDailyInHabitica,
  getHabiticaClient,
  scoreHabitInHabitica,
} from "../src/lib/habitica/service";
import { MC_HELP, parseMcArgs, type McCommand } from "../src/lib/mc-cli";
import type { Project } from "../src/lib/db/schema";
import { slug } from "../src/lib/utils";

async function resolveProject(name: string | undefined): Promise<Project | undefined> {
  if (!name) return undefined;
  const projects = await listProjects();
  const needle = slug(name);
  const matches = projects.filter(
    (p) => slug(p.name) === needle || slug(p.name).startsWith(needle),
  );
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) throw new Error(`No project named "${name}"`);
  throw new Error(`Ambiguous project "${name}": ${matches.map((p) => p.name).join(", ")}`);
}

async function run(cmd: McCommand): Promise<void> {
  switch (cmd.name) {
    case "help":
      process.stdout.write(MC_HELP);
      return;
    case "list": {
      const inbox = cmd.inbox || cmd.project?.toLowerCase() === "inbox";
      const project = inbox ? undefined : await resolveProject(cmd.project);
      const tasks = await listTasks({
        projectId: inbox ? null : project?.id,
        status: cmd.status,
      });
      const rows = await Promise.all(
        tasks.map(async (t) => {
          const subs = await listSubtasks([t.id]);
          return {
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            projectId: t.projectId,
            subs: `${subs.filter((s) => s.completed).length}/${subs.length}`,
          };
        }),
      );
      if (cmd.json) {
        process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
        return;
      }
      for (const row of rows) {
        process.stdout.write(`${row.id}\t${row.status}\t${row.priority}\t${row.subs}\t${row.title}\n`);
      }
      return;
    }
    case "show": {
      const task = await getTask(cmd.id);
      if (!task) throw new Error(`Task ${cmd.id} not found`);
      const subs = await listSubtasks([task.id]);
      process.stdout.write(
        `#${task.id} ${task.title}\n${task.status} · ${task.priority}\n${task.notes ?? ""}\n`,
      );
      for (const sub of subs) {
        process.stdout.write(`  [${sub.completed ? "x" : " "}] ${sub.id} ${sub.title}\n`);
      }
      return;
    }
    case "add": {
      const project = await resolveProject(cmd.project);
      const task = await createTask({
        title: cmd.title,
        notes: cmd.notes ?? null,
        priority: cmd.priority,
        projectId: project?.id ?? null,
      });
      for (let i = 0; i < cmd.subs.length; i++) {
        await createSubtask({ taskId: task.id, title: cmd.subs[i], position: i });
      }
      await logActivity({
        type: "task_created",
        entityType: "task",
        entityId: task.id,
        summary: `Created "${task.title}"`,
      });
      process.stdout.write(`${task.id}\n`);
      return;
    }
    case "assign": {
      const task = await getTask(cmd.id);
      if (!task) throw new Error(`Task ${cmd.id} not found`);
      const toInbox = cmd.project.toLowerCase() === "inbox";
      const project = toInbox ? undefined : await resolveProject(cmd.project);
      await updateTask(cmd.id, { projectId: toInbox ? null : (project?.id ?? null) });
      process.stdout.write(`assigned ${cmd.id} ${toInbox ? "inbox" : project?.name}\n`);
      return;
    }
    case "done": {
      const task = await getTask(cmd.id);
      if (!task) throw new Error(`Task ${cmd.id} not found`);
      await completeTask(cmd.id);
      await logActivity({
        type: "task_completed",
        entityType: "task",
        entityId: cmd.id,
        summary: `Completed "${task.title}"`,
      });
      process.stdout.write(`done ${cmd.id}\n`);
      return;
    }
    case "reopen": {
      const task = await getTask(cmd.id);
      if (!task) throw new Error(`Task ${cmd.id} not found`);
      await reopenTask(cmd.id);
      await logActivity({
        type: "task_reopened",
        entityType: "task",
        entityId: cmd.id,
        summary: `Reopened "${task.title}"`,
      });
      process.stdout.write(`reopened ${cmd.id}\n`);
      return;
    }
    case "move": {
      const task = await getTask(cmd.id);
      if (!task) throw new Error(`Task ${cmd.id} not found`);
      await setTaskStatus(cmd.id, cmd.status);
      await logActivity({
        type: "task_moved",
        entityType: "task",
        entityId: cmd.id,
        summary: `Moved "${task.title}" to ${cmd.status}`,
      });
      process.stdout.write(`moved ${cmd.id} ${cmd.status}\n`);
      return;
    }
    case "note": {
      const task = await updateTask(cmd.id, { notes: cmd.notes });
      if (!task) throw new Error(`Task ${cmd.id} not found`);
      process.stdout.write(`noted ${cmd.id}\n`);
      return;
    }
    case "sub-add": {
      const existing = await listSubtasks([cmd.id]);
      const sub = await createSubtask({
        taskId: cmd.id,
        title: cmd.title,
        position: existing.length,
      });
      process.stdout.write(`${sub.id}\n`);
      return;
    }
    case "sub-done": {
      const existing = await listSubtasks([cmd.id]);
      const match =
        existing.find((s) => String(s.id) === cmd.sub) ??
        existing.find((s) => s.title.toLowerCase() === cmd.sub.toLowerCase());
      if (!match) throw new Error(`Subtask "${cmd.sub}" not found on task ${cmd.id}`);
      await updateSubtask(match.id, { completed: true });
      process.stdout.write(`done sub ${match.id}\n`);
      return;
    }
    case "daily-list": {
      const now = new Date();
      const dailies = await listDailies();
      const rows = dailies.map((d) => ({
        id: d.id,
        title: d.title,
        due: isDailyDueOn(d, now),
        done: isCompletedToday(d, now),
        streak: d.streak,
        freq: formatFrequency(d),
      }));
      if (cmd.json) {
        process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
        return;
      }
      for (const row of rows) {
        const mark = row.done ? "x" : row.due ? " " : "-";
        process.stdout.write(`${row.id}\t[${mark}]\t${row.streak}\t${row.title}\n`);
      }
      return;
    }
    case "daily-done": {
      const dailies = await listDailies();
      const daily =
        dailies.find((d) => String(d.id) === cmd.needle) ??
        dailies.find((d) => d.title.toLowerCase().includes(cmd.needle.toLowerCase()));
      if (!daily) throw new Error(`Daily "${cmd.needle}" not found`);
      if (isCompletedToday(daily, new Date())) {
        process.stdout.write(`already done ${daily.id}\n`);
        return;
      }
      await completeDaily(daily.id);
      await logActivity({
        type: "daily_completed",
        entityType: "daily",
        entityId: daily.id,
        summary: `Completed daily "${daily.title}"`,
      });
      if (daily.habiticaId) {
        try {
          const client = await getHabiticaClient();
          await completeDailyInHabitica(client, daily.habiticaId);
        } catch (err) {
          process.stderr.write(`habitica score failed: ${err instanceof Error ? err.message : String(err)}\n`);
        }
      }
      process.stdout.write(`done daily ${daily.id} ${daily.title}\n`);
      return;
    }
    case "habit-score": {
      const habits = await listHabits();
      const habit =
        habits.find((h) => String(h.id) === cmd.needle) ??
        habits.find((h) => h.title.toLowerCase().includes(cmd.needle.toLowerCase()));
      if (!habit) throw new Error(`Habit "${cmd.needle}" not found`);
      await incrementHabitCounter(habit.id, cmd.direction);
      await logActivity({
        type: `habit_scored_${cmd.direction}`,
        entityType: "habit",
        entityId: habit.id,
        summary: `Scored ${cmd.direction} on "${habit.title}"`,
      });
      if (habit.habiticaId) {
        try {
          const client = await getHabiticaClient();
          await scoreHabitInHabitica(client, habit.habiticaId, cmd.direction);
        } catch (err) {
          process.stderr.write(`habitica score failed: ${err instanceof Error ? err.message : String(err)}\n`);
        }
      }
      process.stdout.write(`scored ${cmd.direction} ${habit.id} ${habit.title}\n`);
    }
  }
}

async function main() {
  try {
    const cmd = parseMcArgs(process.argv.slice(2));
    await run(cmd);
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
}

void main();
