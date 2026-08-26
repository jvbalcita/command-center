import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getTask, listSubtasks } from "@/lib/db/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await getDb();
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

    const subtasks = await listSubtasks([taskId]);

    return NextResponse.json({ ok: true, data: { ...task, subtasks } });
  } catch (error) {
    console.error("Failed to get task:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to get task" },
      { status: 500 },
    );
  }
}
