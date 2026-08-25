import { getSetting, setSetting } from "./db/queries";
import { maybeEncrypt, maybeDecrypt } from "./crypto";

const KEY_USER_ID = "habiticaUserId";
const KEY_API_TOKEN = "habiticaApiToken";

export interface HabiticaSettings {
  userId: string;
  apiToken: string;
}

export async function getSavedHabiticaSettings(): Promise<Partial<HabiticaSettings>> {
  const [userId, rawApiToken] = await Promise.all([
    getSetting(KEY_USER_ID),
    getSetting(KEY_API_TOKEN),
  ]);
  return {
    ...(userId ? { userId } : {}),
    ...(rawApiToken ? { apiToken: maybeDecrypt(KEY_API_TOKEN, rawApiToken) } : {}),
  };
}

export async function saveHabiticaSettings(input: HabiticaSettings): Promise<void> {
  await Promise.all([
    setSetting(KEY_USER_ID, input.userId),
    setSetting(KEY_API_TOKEN, maybeEncrypt(KEY_API_TOKEN, input.apiToken)),
  ]);
}
