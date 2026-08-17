import type { Project, Task } from "@/lib/db/schema";
import { TaskItem } from "./task-item";

export function TaskList({ tasks, projects }: { tasks: Task[]; projects: Project[] }) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium text-foreground">No tasks here</p>
        <p className="mt-1 text-sm text-muted-foreground">Add your first task to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} projects={projects} />
      ))}
    </div>
  );
}
