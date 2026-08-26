import { NextRequest, NextResponse } from "next/server";
import { getDb, db } from "@/lib/db";
import { listAutomationRules, createAutomationRule } from "@/lib/db/queries";
import { automationRules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  await getDb();
  try {
    const rules = await listAutomationRules();
    return NextResponse.json(rules);
  } catch (error) {
    console.error("Failed to list automation rules:", error);
    return NextResponse.json({ error: "Failed to list rules" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  await getDb();
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!body.triggerType) {
      return NextResponse.json({ error: "Trigger type is required" }, { status: 400 });
    }
    if (body.triggerType === "schedule" && !body.triggerConfigCron?.trim()) {
      return NextResponse.json({ error: "Cron expression required for schedule triggers" }, { status: 400 });
    }
    if (!body.action?.trim()) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    // Prepare the rule data
    const ruleData = {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      enabled: body.enabled ?? true,
      triggerType: body.triggerType,
      triggerConfig: body.triggerType === "schedule" 
        ? JSON.stringify({ cron: body.triggerConfigCron.trim() })
        : body.triggerConfig || null,
      condition: body.condition?.trim() || null,
      action: body.action.trim(),
    };

    const rule = await createAutomationRule(ruleData);
    return NextResponse.json(rule);
  } catch (error) {
    console.error("Failed to create automation rule:", error);
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  }
}