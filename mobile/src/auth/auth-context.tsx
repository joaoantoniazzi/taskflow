import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { ApiError, apiRequest } from "../lib/api";

import { clearSession, readSession, writeSession } from "../lib/session-store";

import type { Session, User } from "../types/api";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;

  signIn(email: string, password: string): Promise<void>;

  register(name: string, email: string, password: string): Promise<void>;

  signOut(): Promise<void>;

  updateUser(user: User): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const stored = await readSession();

        if (!active) {
          return;
        }

        if (!stored) {
          setStatus("unauthenticated");
          return;
        }

        // Mostramos a sessão guardada imediatamente.
        setUser(stored.user);
        setStatus("authenticated");

        try {
          const response = await apiRequest<{ user: User }>("/auth/me");

          if (!active) {
            return;
          }

          const latestSession = (await readSession()) ?? stored;

          const updated: Session = {
            ...latestSession,
            user: response.user,
          };

          await writeSession(updated);
          setUser(response.user);
        } catch {
          /*
           * Se o cliente tiver apagado a sessão por falha
           * definitiva na renovação, voltamos ao login.
           *
           * Erros de rede isolados não apagam a sessão.
           */
          const remaining = await readSession();

          if (!active) {
            return;
          }

          if (!remaining) {
            setUser(null);
            setStatus("unauthenticated");
          }
        }
      } catch {
        if (active) {
          setStatus("unauthenticated");
        }
      }
    }

    void restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await apiRequest<Session>("/auth/login", {
      method: "POST",
      authenticated: false,
      body: {
        email,
        password,
      },
    });

    await writeSession(session);

    setUser(session.user);
    setStatus("authenticated");
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await apiRequest<{ user: User }>("/auth/register", {
        method: "POST",
        authenticated: false,
        body: {
          name,
          email,
          password,
        },
      });

      await signIn(email, password);
    },
    [signIn],
  );

  const signOut = useCallback(async () => {
    const session = await readSession();

    try {
      if (session?.refreshToken) {
        await apiRequest("/auth/logout", {
          method: "POST",
          authenticated: false,
          body: {
            refreshToken: session.refreshToken,
          },
        });
      }
    } catch (error) {
      if (!(error instanceof ApiError) || error.status >= 500) {
        // Mesmo sem conexão, permitimos sair localmente.
      }
    } finally {
      await clearSession();
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const updateUser = useCallback(async (updatedUser: User) => {
    const current = await readSession();

    if (current) {
      await writeSession({
        ...current,
        user: updatedUser,
      });
    }

    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        signIn,
        register,
        signOut,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de AuthProvider.");
  }

  return context;
}
