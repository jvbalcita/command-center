import { ThemeToggle } from "./theme-toggle";
import { SettingsDialog } from "./settings-dialog";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AppSidebar } from "./app-sidebar";

export interface BreadcrumbEntry {
  label: string;
  href?: string;
}

/**
 * Shared page layout shell — SidebarProvider + header with trigger/breadcrumb + content area.
 * Wraps both the main page and automation page to eliminate duplicated layout code.
 *
 * This is a Server Component — AppSidebar is also a Server Component that queries the DB.
 * Do NOT add "use client" here, as that would force better-sqlite3 into the browser bundle.
 */
export async function PageShell({
  active,
  breadcrumbs,
  savedHabitica,
  children,
  rightActions,
}: {
  active: string;
  breadcrumbs: BreadcrumbEntry[];
  savedHabitica: { userId?: string | null; apiToken?: string | null };
  children: React.ReactNode;
  rightActions?: React.ReactNode;
}) {
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
                {breadcrumbs.map((crumb, i) => (
                  <BreadcrumbItem
                    key={i}
                    className={i < breadcrumbs.length - 1 ? "hidden md:block" : undefined}
                  >
                    {crumb.href ? (
                      <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                )).reduce<React.ReactNode[]>((acc, item, i) => {
                  if (i > 0) {
                    acc.push(
                      <BreadcrumbSeparator key={`sep-${i}`} className="hidden md:block" />
                    );
                  }
                  acc.push(item);
                  return acc;
                }, [])}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex items-center gap-2 px-4">
            {rightActions}
            <ThemeToggle />
            <SettingsDialog
              initialUserId={savedHabitica.userId ?? ""}
              hasSavedToken={Boolean(savedHabitica.apiToken)}
            />
          </div>
        </header>
        <main className="flex min-h-0 flex-1 overflow-hidden">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}


