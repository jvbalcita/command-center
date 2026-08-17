import { listProjects, listTasks } from "@/lib/db/queries";
import type { Task } from "@/lib/db/schema";
import { AppSidebar } from "./_components/app-sidebar";
import { KanbanBoard } from "./_components/kanban-board";
import { NewTaskButton } from "./_components/new-task-button";
import { ThemeToggle } from "./_components/theme-toggle";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

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
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NewTaskButton projects={projects} defaultProjectId={defaultProjectId} />
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">
          <KanbanBoard tasks={tasks} projects={projects} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
