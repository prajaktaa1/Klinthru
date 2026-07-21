"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { clearStoredAuthToken, getStoredAuthToken, setStoredAuthToken } from "@/lib/authStorage";
import {
  fetchCurrentUser,
  isBackendUnavailableError,
  isUnauthorizedError,
  login as loginRequest,
  logout as logoutRequest
} from "@/lib/apiClient";
import { AuthUser } from "@/lib/types";

type AuthContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function clearAuthState(setUser: (value: AuthUser | null) => void) {
  clearStoredAuthToken();
  setUser(null);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const token = getStoredAuthToken();

        if (!token) {
          clearAuthState(setUser);
          setAuthError(null);
          return;
        }

        const currentUser = await fetchCurrentUser();

        if (!active) {
          return;
        }

        setUser(currentUser);
        setAuthError(null);
      } catch (error) {
        if (!active) {
          return;
        }

        if (isUnauthorizedError(error)) {
          clearAuthState(setUser);
          setAuthError(null);
          return;
        }

        if (isBackendUnavailableError(error)) {
          setAuthError(error.message);
          return;
        }

        console.error("Failed to restore Klinthru session.", error);
        clearAuthState(setUser);
        setAuthError(null);
      } finally {
        if (active) {
          setIsReady(true);
        }
      }
    }

    function handleUnauthorized() {
      clearAuthState(setUser);
      setAuthError(null);
      setIsReady(true);
    }

    void restoreSession();
    window.addEventListener("klinthru:unauthorized", handleUnauthorized);

    return () => {
      active = false;
      window.removeEventListener("klinthru:unauthorized", handleUnauthorized);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      isAuthenticated: Boolean(user),
      authError,
      user,
      async login(email: string, password: string) {
        setAuthError(null);
        const response = await loginRequest(email, password);
        setStoredAuthToken(response.token);
        setUser(response.user);
      },
      async logout() {
        try {
          await logoutRequest();
        } finally {
          clearAuthState(setUser);
        }
      }
    }),
    [authError, isReady, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
