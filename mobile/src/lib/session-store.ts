import * as SecureStore from "expo-secure-store";
import type { Session } from "../types/api";

const SESSION_KEY = "taskflow.session";

export async function readSession(): Promise<Session | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    const value = JSON.parse(raw) as Session;

    if (
      typeof value.accessToken !== "string" ||
      typeof value.refreshToken !== "string" ||
      !value.user ||
      typeof value.user.id !== "string"
    ) {
      await clearSession();
      return null;
    }

    return value;
  } catch {
    await clearSession();
    return null;
  }
}

export async function writeSession(
  session: Session,
): Promise<void> {
  await SecureStore.setItemAsync(
    SESSION_KEY,
    JSON.stringify(session),
  );
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
