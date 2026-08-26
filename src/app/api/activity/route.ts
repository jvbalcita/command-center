import { NextRequest, NextResponse } from "next/server";
import { listActivity } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : 25;

  if (limitRaw && (!Number.isFinite(limit) || limit < 1)) {
    return NextResponse.json(
      { ok: false, error: "limit must be a positive number" },
      { status: 400 },
    );
  }

  try {
    const activity = await listActivity(limit);
    return NextResponse.json({ ok: true, data: activity });
  } catch (error) {
    console.error("Failed to list activity:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to list activity" },
      { status: 500 },
    );
  }
}
