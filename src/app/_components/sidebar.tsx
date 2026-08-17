import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { InboxIcon, Layers01Icon, Rocket02Icon } from "@hugeicons/core-free-icons";
import { listProjects } from "@/lib/db/queries";
import { NewProjectButton } from "./new-project-button";
import type { ReactNode } from "react";

function NavLink({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  );
}

export async function Sidebar({ active }: { active: string }) {
  const projects = await listProjects();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HugeiconsIcon icon={Rocket02Icon} size={18} strokeWidth={1.8} />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-tight">Mission Control</div>
          <div className="text-[11px] text-muted-foreground">Your command center</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
        <NavLink
          href="/"
          active={active === "all"}
          icon={<HugeiconsIcon icon={Layers01Icon} size={18} strokeWidth={1.7} />}
          label="All tasks"
        />
        <NavLink
          href="/?view=inbox"
          active={active === "inbox"}
          icon={<HugeiconsIcon icon={InboxIcon} size={18} strokeWidth={1.7} />}
          label="Inbox"
        />

        <div className="mt-5 mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Projects
        </div>
        {projects.length === 0 ? (
          <p className="px-2.5 py-1 text-xs text-muted-foreground">No projects yet</p>
        ) : (
          projects.map((p) => (
            <NavLink
              key={p.id}
              href={`/?project=${p.id}`}
              active={active === `project-${p.id}`}
              icon={
                <span className="flex size-[18px] items-center justify-center">
                  <span className="size-2.5 rounded-full" style={{ background: p.color ?? "#0d9488" }} />
                </span>
              }
              label={p.name}
            />
          ))
        )}
      </nav>

      <div className="border-t border-border p-3">
        <NewProjectButton />
      </div>
    </aside>
  );
}
