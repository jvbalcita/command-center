import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { pushAllHabits, pushAllDailies } from "@/lib/habitica/push-all";

export async function POST() {
  await getDb();
  try {
    const [habitsResult, dailiesResult] = await Promise.all([
      pushAllHabits(),
      pushAllDailies(),
    ]);

    const totalCreated = habitsResult.created + dailiesResult.created;
    const totalUpdated = habitsResult.updated + dailiesResult.updated;
    const totalFailed = habitsResult.failed + dailiesResult.failed;

    return NextResponse.json({
      ok: totalFailed === 0,
      data: {
        habits: habitsResult,
        dailies: dailiesResult,
        total: {
          created: totalCreated,
          updated: totalUpdated,
          failed: totalFailed,
        },
      },
      error: totalFailed > 0 ? `${totalFailed} items failed to sync` : undefined,
    });
  } catch (error) {
    console.error("Failed to push to Habitica:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to push to Habitica" },
      { status: 500 }
    );
  }
}
