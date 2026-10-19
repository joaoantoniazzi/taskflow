import type { Session } from "../types/api";
import {
  clearSession,
  readSession,
  writeSession,
} from "./session-store";

const configuredUrl = process.env.EXPO_PUBLIC_API_URL;

if (!configuredUrl) {
  throw new Error(
    "Configure EXPO_PUBLIC_API_URL no arquivo .env.",
  );
}

const API_BASE_URL = configuredUrl.replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  authenticated?: boolean;
}

interface ApiErrorResponse {
  error?: {
    message?: string;
    code?: string;
  };
}

async function readResponse<T>(
  response: Response,
): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const raw = await response.text();

  let payload: unknown = undefined;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = undefined;
    }
  }

  if (!response.ok) {
    const errorPayload = payload as ApiErrorResponse | undefined;

    throw new ApiError(
      errorPayload?.error?.message ??
        "Não foi possível completar a solicitação.",
      response.status,
      errorPayload?.error?.code ?? "REQUEST_FAILED",
    );
  }

  return payload as T;
}

async function sendRequest(
  path: string,
  options: ApiOptions,
  token?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });
}

let refreshPromise: Promise<Session | null> | null = null;

async function performRefresh(): Promise<Session | null> {
  const current = await readSession();

  if (!current) {
    return null;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/auth/refresh`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken: current.refreshToken,
        }),
      },
    );

    if (!response.ok) {
      await clearSession();
      return null;
    }

    const nextSession =
      await response.json() as Session;

    await writeSession(nextSession);

    return nextSession;
  } catch {
    // Uma falha de rede não prova que a sessão expirou.
    // Preservamos a sessão para permitir uma nova tentativa.
    return null;
  }
}

async function refreshOnce(): Promise<Session | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const authenticated = options.authenticated !== false;

  const originalSession = authenticated
    ? await readSession()
    : null;

  let response = await sendRequest(
    path,
    options,
    originalSession?.accessToken,
  );

  if (response.status === 401 && authenticated) {
    /*
     * Se outra requisição já renovou a sessão, reutilizamos
     * o token novo. Isso reduz corridas entre requisições.
     */
    let latestSession = await readSession();

    if (
      !latestSession ||
      latestSession.accessToken ===
        originalSession?.accessToken
    ) {
      latestSession = await refreshOnce();
    }

    if (!latestSession) {
      throw new ApiError(
        "Sessão expirada. Entre novamente.",
        401,
        "SESSION_EXPIRED",
      );
    }

    response = await sendRequest(
      path,
      options,
      latestSession.accessToken,
    );
  }

  return readResponse<T>(response);
}
