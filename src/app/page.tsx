import { listProjects, listTasks, listHabits, listDailies, listSubtasks } from "@/lib/db/queries";
import { getSavedHabiticaSettings } from "@/lib/settings";
import type { Task, Habit, Daily } from "@/lib/db/schema";
import { KanbanBoard } from "./_components/kanban-board";
import { NewTaskButton } from "./_components/new-task-button";
import { DashboardStats } from "./_components/dashboard-stats";
import { ActivityFeed } from "./_components/activity-feed";
import { CommandBar } from "./_components/command-bar";
import { RoutinesBoard } from "./_components/routines-board";
import { PageShell } from "./_components/page-shell";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const projects = await listProjects();
  const savedHabitica = await getSavedHabiticaSettings();

  let tasks: Task[] = [];
  let habits: Habit[] = [];
  let dailies: Daily[] = [];
  let heading: string;
  let active: string;
  let defaultProjectId: number | undefined;
  let subtasks: Awaited<ReturnType<typeof listSubtasks>> = [];

  if (sp.project) {
    const pid = Number(sp.project);
    const project = projects.find((p) => p.id === pid);
    tasks = await listTasks({ projectId: pid });
    heading = project?.name ?? "Project";
    active = `project-${pid}`;
    defaultProjectId = pid;
  } else if (sp.view === "inbox") {
    tasks = await listTasks({ projectId: null });
    heading = "Inbox";
    active = "inbox";
  } else if (sp.view === "habits" || sp.view === "dailies" || sp.view === "routines") {
    habits = await listHabits();
    dailies = await listDailies();
    heading = "Habits & Dailies";
    active = "routines";
  } else {
    tasks = await listTasks();
    heading = "All tasks";
    active = "all";
  }

  if (tasks.length > 0) {
    subtasks = await listSubtasks(tasks.map((t) => t.id));
  }
  const openCount = tasks.filter((t) => t.status !== "done").length;

  return (
    <PageShell
      active={active}
      breadcrumbs={[
        { label: "Mission Control", href: "/" },
        { label: heading },
      ]}
      savedHabitica={savedHabitica}
      rightActions={
        <>
          {active !== "routines" ? (
            <span className="hidden text-xs text-muted-foreground sm:block">
              {openCount} open
            </span>
          ) : null}
          <CommandBar projects={projects} />
          {active !== "routines" ? (
            <NewTaskButton projects={projects} defaultProjectId={defaultProjectId} />
          ) : null}
        </>
      }
    >
      <div className="flex min-w-0 flex-1 flex-col">
        {active === "routines" ? (
          <RoutinesBoard habits={habits} dailies={dailies} />
        ) : (
          <>
            <DashboardStats tasks={tasks} />
            <div className="min-h-0 flex-1 overflow-hidden">
              <KanbanBoard tasks={tasks} projects={projects} subtasks={subtasks} />
            </div>
          </>
        )}
      </div>
      <ActivityFeed />
    </PageShell>
  );
}
