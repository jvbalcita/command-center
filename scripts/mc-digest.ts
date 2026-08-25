import { listDailies, listTasks } from "../src/lib/db/queries";
import { formatFrequency, isCompletedToday, isDailyDueOn } from "../src/lib/daily-state";

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

async function main() {
  const now = new Date();
  const today = startOfDay(now);
  const dailies = await listDailies();
  const due = dailies.filter((d) => !isCompletedToday(d, now) && isDailyDueOn(d, now));
  const tasks = await listTasks({ status: "todo" });
  const dated = tasks.filter((t) => t.dueDate);
  const overdue = dated.filter((t) => startOfDay(new Date(t.dueDate as Date)) < today);
  const dueToday = dated.filter((t) => startOfDay(new Date(t.dueDate as Date)) === today);

  const lines = [
    `Mission Control — ${now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`,
  ];
  if (due.length) {
    lines.push("", "Dailies due:");
    for (const d of due) lines.push(`• ${d.title} (${formatFrequency(d)}, streak ${d.streak})`);
  } else {
    lines.push("", "No open dailies.");
  }
  if (dueToday.length || overdue.length) {
    lines.push("", "Todos:");
    for (const t of overdue) lines.push(`• OVERDUE #${t.id} ${t.title}`);
    for (const t of dueToday) lines.push(`• due today #${t.id} ${t.title}`);
  }
  process.stdout.write(`${lines.join("\n")}\n`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
