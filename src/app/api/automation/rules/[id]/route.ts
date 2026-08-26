import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAutomationRule, updateAutomationRule, deleteAutomationRule } from "@/lib/db/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await getDb();
  try {
    const { id } = await params;
    const rule = await getAutomationRule(Number(id));
    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }
    return NextResponse.json(rule);
  } catch (error) {
    console.error("Failed to get automation rule:", error);
    return NextResponse.json({ error: "Failed to get rule" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await getDb();
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Validate
    if (body.name !== undefined && !body.name?.trim()) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    if (body.triggerType === "schedule" && body.triggerConfigCron !== undefined && !body.triggerConfigCron?.trim()) {
      return NextResponse.json({ error: "Cron expression required for schedule triggers" }, { status: 400 });
    }
    if (body.action !== undefined && !body.action?.trim()) {
      return NextResponse.json({ error: "Action cannot be empty" }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.enabled !== undefined) updateData.enabled = body.enabled;
    if (body.triggerType !== undefined) updateData.triggerType = body.triggerType;
    if (body.triggerConfig !== undefined) updateData.triggerConfig = body.triggerConfig;
    if (body.triggerConfigCron !== undefined && body.triggerType === "schedule") {
      updateData.triggerConfig = JSON.stringify({ cron: body.triggerConfigCron.trim() });
    }
    if (body.condition !== undefined) updateData.condition = body.condition?.trim() || null;
    if (body.action !== undefined) updateData.action = body.action.trim();

    const rule = await updateAutomationRule(Number(id), updateData);
    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }
    return NextResponse.json(rule);
  } catch (error) {
    console.error("Failed to update automation rule:", error);
    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await getDb();
  try {
    const { id } = await params;
    await deleteAutomationRule(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete automation rule:", error);
    return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  }
}