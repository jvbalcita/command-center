import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { completeDailyAction } from "@/lib/actions";
import { getDaily } from "@/lib/db/queries";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await getDb();
  const { id: rawId } = await params;
  const dailyId = Number(rawId);

  if (!Number.isFinite(dailyId) || dailyId < 1) {
    return NextResponse.json(
      { ok: false, error: "Invalid daily ID" },
      { status: 400 },
    );
  }

  try {
    const daily = await getDaily(dailyId);
    if (!daily) {
      return NextResponse.json(
        { ok: false, error: "Daily not found" },
        { status: 404 },
      );
    }

    await completeDailyAction(dailyId);
    return NextResponse.json({ ok: true, data: { completed: true } });
  } catch (error) {
    console.error("Failed to complete daily:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to complete daily" },
      { status: 500 },
    );
  }
}
