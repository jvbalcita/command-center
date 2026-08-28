import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { importAllFromHabitica } from "@/lib/habitica/service";

export async function POST() {
  await getDb();
  try {
    const result = await importAllFromHabitica();
    const imported = result.habits.imported + result.dailies.imported + result.todos.imported;
    const updated = result.habits.updated + result.dailies.updated + result.todos.updated;
    const failed = result.habits.failed + result.dailies.failed + result.todos.failed;
    
    return NextResponse.json({
      ok: failed === 0,
      data: {
        imported,
        updated,
        failed,
        details: result,
      },
      error: failed > 0 ? `Failed: ${failed} items` : undefined,
    });
  } catch (error) {
    console.error("Failed to sync from Habitica:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to sync from Habitica" },
      { status: 500 }
    );
  }
}
