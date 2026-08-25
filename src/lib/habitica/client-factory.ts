import { getSavedHabiticaSettings } from "../settings";
import { HabiticaClient } from "./client";

export async function getHabiticaClient(): Promise<HabiticaClient> {
  const saved = await getSavedHabiticaSettings();
  const userId = saved.userId ?? process.env.HABITICA_USER_ID;
  const apiToken = saved.apiToken ?? process.env.HABITICA_API_TOKEN;
  if (!userId || !apiToken) {
    throw new Error(
      "Habitica credentials missing — add them in Settings or set HABITICA_USER_ID / HABITICA_API_TOKEN",
    );
  }
  return new HabiticaClient({ userId, apiToken });
}
