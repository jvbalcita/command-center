import { listProjects } from "@/lib/db/queries";
import { getSavedHabiticaSettings } from "@/lib/settings";
import { AutomationRulesView } from "@/app/_components/automation-rules-view";
import { PageShell } from "@/app/_components/page-shell";

export default async function AutomationRulesPage() {
  const projects = await listProjects();
  const savedHabitica = await getSavedHabiticaSettings();

  return (
    <PageShell
      active="automation"
      breadcrumbs={[
        { label: "Mission Control", href: "/" },
        { label: "Automation Rules" },
      ]}
      savedHabitica={savedHabitica}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <AutomationRulesView projects={projects} />
      </div>
    </PageShell>
  );
}