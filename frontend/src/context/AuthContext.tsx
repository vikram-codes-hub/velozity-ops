import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";

import {
  apiClient,
  setAccessToken,
  registerSessionExpiredHandler,
  getApiErrorMessage,
} from "../lib/api";

export type Role = "ADMIN" | "PM" | "DEVELOPER";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean; // true only during the initial silent-refresh check
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    try {
      const res = await apiClient.post("/api/auth/login", { email, password });
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      return res.data.user;
    } catch (err) {
      throw new Error(getApiErrorMessage(err));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/api/auth/logout");
    } catch {
      // Even if the network call fails, still clear local state below —
      // don't strand the user in a logged-in-looking UI with a dead token.
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  // On session expiry (refresh failed — refresh token expired/revoked),
  // apiClient calls this instead of touching React state directly.
  useEffect(() => {
    registerSessionExpiredHandler(() => {
      setUser(null);
    });
  }, []);

  // On first mount, attempt a silent refresh to restore the session
  // without making the user re-enter credentials on every page reload —
  // the HttpOnly refresh cookie survives a reload even though the
  // in-memory access token doesn't.
  useEffect(() => {
    let cancelled = false;

    async function attemptSilentRefresh() {
      try {
        const res = await apiClient.post("/api/auth/refresh");
        if (!cancelled) {
          setAccessToken(res.data.accessToken);
          setUser(res.data.user);
        }
      } catch {
        // No valid refresh cookie — user just isn't logged in. Not an
        // error state, so nothing to surface to the UI here.
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    attemptSilentRefresh();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return ctx;
}
