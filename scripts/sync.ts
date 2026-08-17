import "dotenv/config";
import { syncAllTasks } from "../src/lib/habitica/service";

async function main() {
  const result = await syncAllTasks();
  console.log(`✓ sync complete: ${result.synced} synced, ${result.failed} failed`);
}

main().catch((err) => {
  console.error("sync failed:", err);
  process.exit(1);
});
