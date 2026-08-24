import "dotenv/config";
import { runAutomation } from "@/lib/automation/rules";

async function main() {
  const triggerType = process.argv[2] || "schedule";
  const trigger: any = { type: triggerType };
  if (triggerType === "schedule") trigger.cron = "manual";
  const results = await runAutomation(trigger);
  console.log(JSON.stringify(results, null, 2));
  const failed = results.filter(r => !r.success).length;
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});