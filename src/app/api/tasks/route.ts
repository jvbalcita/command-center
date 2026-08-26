import { NextRequest, NextResponse } from "next/server";
import {
  listTasks,
  createTask as dbCreateTask,
  createSubtask as dbCreateSubtask,
  logActivity,
} from "@/lib/db/queries";
import { taskSchema } from "@/lib/validation";
import { enqueueTaskSync } from "@/lib/habitica/service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const projectParam = searchParams.get("project");
    const statusParam = searchParams.get("status");
    const includeArchivedParam = searchParams.get("includeArchived");

    const projectId =
      projectParam === null
        ? undefined
        : projectParam === ""
          ? null
          : Number(projectParam);

    const status =
      statusParam === "todo" || statusParam === "in_progress" || statusParam === "done"
        ? statusParam
        : undefined;

    const includeArchived = includeArchivedParam === "true";

    const tasks = await listTasks({ projectId, status, includeArchived });
    return NextResponse.json({ ok: true, data: tasks });
  } catch (error) {
    console.error("Failed to list tasks:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to list tasks" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = taskSchema.safeParse({
      title: body.title,
      notes: body.notes || undefined,
      priority: body.priority || "medium",
      difficulty: body.difficulty || "easy",
      dueDate: body.dueDate || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    // Validate subtasks if provided
    const subtasks = Array.isArray(body.subtasks) ? body.subtasks : [];
    const validatedSubtasks: { title: string; completed: boolean }[] = [];
    for (const st of subtasks) {
      if (typeof st.title !== "string" || st.title.trim().length === 0) {
        return NextResponse.json(
          { ok: false, error: "Subtask title is required" },
          { status: 400 },
        );
      }
      validatedSubtasks.push({
        title: st.title.trim(),
        completed: Boolean(st.completed),
      });
    }

    // Parse due date
    const dueDateStr = parsed.data.dueDate;
    const dueDate = dueDateStr ? new Date(`${dueDateStr}T12:00:00`) : null;

    const task = await dbCreateTask({
      title: parsed.data.title,
      notes: parsed.data.notes ?? null,
      priority: parsed.data.priority,
      difficulty: parsed.data.difficulty,
      dueDate,
      projectId: body.projectId != null ? Number(body.projectId) : null,
    });

    // Create subtasks
    for (let i = 0; i < validatedSubtasks.length; i++) {
      await dbCreateSubtask({
        taskId: task.id,
        title: validatedSubtasks[i].title,
        completed: validatedSubtasks[i].completed,
        position: i,
      });
    }

    // Log activity
    await logActivity({
      type: "task_created",
      entityType: "task",
      entityId: task.id,
      summary: `Created "${task.title}"`,
    });

    // Habitica sync
    enqueueTaskSync(task.id);

    return NextResponse.json({ ok: true, data: task }, { status: 201 });
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to create task" },
      { status: 500 },
    );
  }
}
