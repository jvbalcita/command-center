import { listProjects, listTasks } from "@/lib/db/queries";
import { getSavedHabiticaSettings } from "@/lib/settings";
import type { Task } from "@/lib/db/schema";
import { AppSidebar } from "./_components/app-sidebar";
import { KanbanBoard } from "./_components/kanban-board";
import { NewTaskButton } from "./_components/new-task-button";
import { ThemeToggle } from "./_components/theme-toggle";
import { DashboardStats } from "./_components/dashboard-stats";
import { ActivityFeed } from "./_components/activity-feed";
import { CommandBar } from "./_components/command-bar";
import { SettingsDialog } from "./_components/settings-dialog";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const projects = await listProjects();
  const savedHabitica = await getSavedHabiticaSettings();

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
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <div aria-hidden className="mr-2 h-4 w-px shrink-0 bg-border" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">Mission Control</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{heading}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex items-center gap-2 px-4">
            <span className="hidden text-xs text-muted-foreground sm:block">
              {openCount} open
            </span>
            <CommandBar projects={projects} />
            <ThemeToggle />
            <SettingsDialog initialUserId={savedHabitica.userId ?? ""} initialApiToken={savedHabitica.apiToken ?? ""} />
            <NewTaskButton projects={projects} defaultProjectId={defaultProjectId} />
          </div>
        </header>
        <main className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col">
            <DashboardStats tasks={tasks} />
            <div className="min-h-0 flex-1 overflow-hidden">
              <KanbanBoard tasks={tasks} projects={projects} />
            </div>
          </div>
          <ActivityFeed />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
