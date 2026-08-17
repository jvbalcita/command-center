import { getSetting, setSetting } from "./db/queries";

const KEY_USER_ID = "habiticaUserId";
const KEY_API_TOKEN = "habiticaApiToken";

export interface HabiticaSettings {
  userId: string;
  apiToken: string;
}

export async function getSavedHabiticaSettings(): Promise<Partial<HabiticaSettings>> {
  const [userId, apiToken] = await Promise.all([
    getSetting(KEY_USER_ID),
    getSetting(KEY_API_TOKEN),
  ]);
  return {
    ...(userId ? { userId } : {}),
    ...(apiToken ? { apiToken } : {}),
  };
}

export async function saveHabiticaSettings(input: HabiticaSettings): Promise<void> {
  await Promise.all([
    setSetting(KEY_USER_ID, input.userId),
    setSetting(KEY_API_TOKEN, input.apiToken),
  ]);
}
