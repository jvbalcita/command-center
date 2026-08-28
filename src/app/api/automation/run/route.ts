import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { runAutomation } from "@/lib/automation/rules";

export async function POST() {
  await getDb();
  try {
    const trigger: Parameters<typeof runAutomation>[0] = { type: "schedule", cron: "manual" };
    const results = await runAutomation(trigger);
    const failed = results.filter((r: any) => !r.success).length;
    
    return NextResponse.json({
      ok: failed === 0,
      data: {
        total: results.length,
        failed,
        results,
      },
      error: failed > 0 ? `${failed} rules failed` : undefined,
    });
  } catch (error) {
    console.error("Failed to run automation:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to run automation" },
      { status: 500 }
    );
  }
}
