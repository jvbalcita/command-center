import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scoreHabitAction } from "@/lib/actions";
import { getHabit } from "@/lib/db/queries";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await getDb();
  const { id: rawId } = await params;
  const habitId = Number(rawId);

  if (!Number.isFinite(habitId) || habitId < 1) {
    return NextResponse.json(
      { ok: false, error: "Invalid habit ID" },
      { status: 400 },
    );
  }

  try {
    const habit = await getHabit(habitId);
    if (!habit) {
      return NextResponse.json(
        { ok: false, error: "Habit not found" },
        { status: 404 },
      );
    }

    let direction: "up" | "down";
    try {
      const body = await request.json();
      if (body.direction !== "up" && body.direction !== "down") {
        return NextResponse.json(
          { ok: false, error: "direction must be \"up\" or \"down\"" },
          { status: 400 },
        );
      }
      direction = body.direction;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    await scoreHabitAction(habitId, direction);
    return NextResponse.json({ ok: true, data: { direction } });
  } catch (error) {
    console.error("Failed to score habit:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to score habit" },
      { status: 500 },
    );
  }
}
