import { NextResponse } from "next/server";
import { listHabits } from "@/lib/db/queries";

export async function GET() {
  try {
    const habits = await listHabits();
    return NextResponse.json({ ok: true, data: habits });
  } catch (error) {
    console.error("Failed to list habits:", error);
    return NextResponse.json({ ok: false, error: "Failed to list habits" }, { status: 500 });
  }
}
