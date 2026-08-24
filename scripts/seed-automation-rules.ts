import "dotenv/config";
import { db } from "@/lib/db";
import { automationRules } from "@/lib/db/schema";
import { defaultRules } from "@/lib/automation/rules";

async function main() {
  console.log("Seeding default automation rules...");
  
  for (const rule of defaultRules) {
    // Check if rule already exists by name
    const existing = await db
      .select()
      .from(automationRules)
      .where(eq(automationRules.name, rule.name))
      .limit(1);
    
    if (existing.length > 0) {
      console.log(`  Skipping "${rule.name}" (already exists)`);
      continue;
    }
    
    const now = new Date();
    await db.insert(automationRules).values({
      ...rule,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  Created "${rule.name}"`);
  }
  
  console.log("Done!");
}

import { eq } from "drizzle-orm";
main().catch(err => {
  console.error(err);
  process.exit(1);
});