import { listProjects, listTasks } from "@/lib/db/queries";
import type { Task } from "@/lib/db/schema";
import { PRIORITY_META } from "@/lib/task-utils";
import { AppSidebar } from "./_components/app-sidebar";
import { TaskList } from "./_components/task-list";
import { NewTaskButton } from "./_components/new-task-button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aDone = a.status === "done" ? 1 : 0;
    const bDone = b.status === "done" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    const aDue = a.dueDate?.getTime() ?? Infinity;
    const bDue = b.dueDate?.getTime() ?? Infinity;
    if (aDue !== bDue) return aDue - bDue;
    const aRank = PRIORITY_META[(a.priority ?? "medium") as keyof typeof PRIORITY_META].rank;
    const bRank = PRIORITY_META[(b.priority ?? "medium") as keyof typeof PRIORITY_META].rank;
    return bRank - aRank;
  });
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const projects = await listProjects();

  let tasks: Task[];
  let heading: string;
  let active: string;
  let defaultProjectId: number | undefined;

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
  } else {
    tasks = await listTasks();
    heading = "All tasks";
    active = "all";
  }

  tasks = sortTasks(tasks);
  const openCount = tasks.filter((t) => t.status !== "done").length;

  return (
    <SidebarProvider>
      <AppSidebar active={active} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight">{heading}</h1>
              <p className="text-xs text-muted-foreground">
                {openCount} open {openCount === 1 ? "task" : "tasks"}
              </p>
            </div>
            <NewTaskButton projects={projects} defaultProjectId={defaultProjectId} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-6 py-8">
            <TaskList tasks={tasks} projects={projects} />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
