import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { InboxIcon, Layers01Icon, Rocket02Icon } from "@hugeicons/core-free-icons";
import { listProjects } from "@/lib/db/queries";
import { NewProjectButton } from "./new-project-button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export async function AppSidebar({ active }: { active: string }) {
  const projects = await listProjects();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Mission Control">
              <span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <HugeiconsIcon icon={Rocket02Icon} size={18} strokeWidth={1.8} />
              </span>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-heading font-semibold">Mission Control</span>
                <span className="truncate text-xs text-muted-foreground">Command center</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/" />}
                isActive={active === "all"}
                tooltip="All tasks"
              >
                <HugeiconsIcon icon={Layers01Icon} size={16} strokeWidth={1.7} />
                <span>All tasks</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/?view=inbox" />}
                isActive={active === "inbox"}
                tooltip="Inbox"
              >
                <HugeiconsIcon icon={InboxIcon} size={16} strokeWidth={1.7} />
                <span>Inbox</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
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
            <SidebarMenuItem>
              <NewProjectButton />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
