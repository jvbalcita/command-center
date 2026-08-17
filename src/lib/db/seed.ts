import { createProject, createTask } from "./queries";

async function main() {
  const project = await createProject({
    name: "Mission Control",
    description: "Seed project (dev only)",
    color: "#0D9488",
    icon: "rocket-01",
  });

  await createTask({
    projectId: project.id,
    title: "Wire up the Habitica client",
    notes: "Phase 3 — typed client in src/lib/habitica/",
    priority: "high",
  });
  await createTask({
    projectId: project.id,
    title: "Design the dashboard",
    notes: "Use ui-ux-pro-max design system (teal + HugeIcons)",
    priority: "medium",
  });
  await createTask({ title: "Inbox task — no project", priority: "low" });

  console.log("✓ seeded project:", project.name);
}

main().catch((err) => {
  console.error("seed failed:", err);
  process.exit(1);
});
