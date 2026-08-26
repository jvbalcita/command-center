import { NextResponse } from "next/server";
import { listDailies } from "@/lib/db/queries";

export async function GET() {
  try {
    const dailies = await listDailies();
    return NextResponse.json({ ok: true, data: dailies });
  } catch (error) {
    console.error("Failed to list dailies:", error);
    return NextResponse.json({ ok: false, error: "Failed to list dailies" }, { status: 500 });
  }
}
