
import type { Session } from "../types/api";

const SESSION_KEY = "taskflow.session";

export async function readSession(): Promise<Session | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(SESSION_KEY);

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
  if (typeof window === "undefined") {
    throw new Error(
      "O armazenamento da sessão não está disponível.",
    );
  }

  window.sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify(session),
  );
}

export async function clearSession(): Promise<void> {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(SESSION_KEY);
  }
}
