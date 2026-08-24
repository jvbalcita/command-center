import "dotenv/config";
import { importAllFromHabitica } from "../src/lib/habitica/service";

async function main() {
  const result = await importAllFromHabitica();
  const imported = result.habits.imported + result.dailies.imported + result.todos.imported;
  const updated = result.habits.updated + result.dailies.updated + result.todos.updated;
  const failed = result.habits.failed + result.dailies.failed + result.todos.failed;
  if (failed > 0) {
    console.log(
      `Habitica pull failed=${failed} imported=${imported} updated=${updated}`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
