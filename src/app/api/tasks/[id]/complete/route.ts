import { NextRequest, NextResponse } from "next/server";
import {
  getTask,
  completeTask,
  reopenTask,
  logActivity,
} from "@/lib/db/queries";
import { enqueueTaskSync } from "@/lib/habitica/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const taskId = Number(id);

    if (isNaN(taskId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid task ID" },
        { status: 400 },
      );
    }

    const task = await getTask(taskId);
    if (!task) {
      return NextResponse.json(
        { ok: false, error: "Task not found" },
        { status: 404 },
      );
    }

    // Toggle completion state
    let updatedTask;
    if (task.status === "done") {
      updatedTask = await reopenTask(taskId);
      await logActivity({
        type: "task_reopened",
        entityType: "task",
        entityId: taskId,
        summary: `Reopened "${task.title}"`,
      });
    } else {
      updatedTask = await completeTask(taskId);
      await logActivity({
        type: "task_completed",
        entityType: "task",
        entityId: taskId,
        summary: `Completed "${task.title}"`,
      });
    }

    // Habitica sync
    enqueueTaskSync(taskId);

    return NextResponse.json({ ok: true, data: updatedTask });
  } catch (error) {
    console.error("Failed to toggle task completion:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to toggle task completion" },
      { status: 500 },
    );
  }
}
