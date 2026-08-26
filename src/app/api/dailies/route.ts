import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listDailies } from "@/lib/db/queries";

export async function GET() {
  await getDb();
  try {
    const dailies = await listDailies();
    return NextResponse.json({ ok: true, data: dailies });
  } catch (error) {
    console.error("Failed to list dailies:", error);
    return NextResponse.json({ ok: false, error: "Failed to list dailies" }, { status: 500 });
  }
}
