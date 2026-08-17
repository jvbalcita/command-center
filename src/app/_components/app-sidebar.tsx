import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { InboxIcon, Layers01Icon, Rocket02Icon } from "@hugeicons/core-free-icons";
import { listProjects } from "@/lib/db/queries";
import { NewProjectButton } from "./new-project-button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export async function AppSidebar({ active }: { active: string }) {
  const projects = await listProjects();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-1">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HugeiconsIcon icon={Rocket02Icon} size={18} strokeWidth={1.8} />
          </span>
          <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-bold tracking-tight">Mission Control</div>
            <div className="truncate text-[11px] text-muted-foreground">Your command center</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/" />} isActive={active === "all"} tooltip="All tasks">
                  <HugeiconsIcon icon={Layers01Icon} size={16} strokeWidth={1.7} />
                  <span>All tasks</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/?view=inbox" />} isActive={active === "inbox"} tooltip="Inbox">
                  <HugeiconsIcon icon={InboxIcon} size={16} strokeWidth={1.7} />
                  <span>Inbox</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.length === 0 ? (
                <p className="px-3 py-1 text-xs text-muted-foreground">No projects yet</p>
              ) : (
                projects.map((p) => (
                  <SidebarMenuItem key={p.id}>
                    <SidebarMenuButton
                      render={<Link href={`/?project=${p.id}`} />}
                      isActive={active === `project-${p.id}`}
                      tooltip={p.name}
                    >
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: p.color ?? "#0d9488" }} />
                      <span className="truncate">{p.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NewProjectButton />
      </SidebarFooter>
    </Sidebar>
  );
}
