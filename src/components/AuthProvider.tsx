"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { ensureSeeded } from "@/lib/db";
import { getSession, login as doLogin, logout as doLogout } from "@/lib/auth";
import { setOwnerKey, syncNow } from "@/lib/cloud";
import type { Role, Session } from "@/lib/types";

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  login: (username: string, pin: string) => ReturnType<typeof doLogin>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      await ensureSeeded();
      const s = await getSession();
      if (active) {
        setSession(s);
        setLoading(false);
        if (s?.ownerKey) {
          setOwnerKey(s.ownerKey);
          void syncNow();
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Reconcile with the cloud whenever the device comes back online.
  useEffect(() => {
    const onOnline = () => {
      if (session?.ownerKey) void syncNow();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [session?.ownerKey]);

  const login = useCallback(async (username: string, pin: string) => {
    const result = await doLogin(username, pin);
    if (result.ok) {
      setSession(result.session);
      setOwnerKey(result.session.ownerKey);
      void syncNow();
    }
    return result;
  }, []);

  const logout = useCallback(async () => {
    await doLogout();
    setSession(null);
    setOwnerKey(null);
  }, []);

  const value = useMemo(
    () => ({ session, loading, login, logout }),
    [session, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

/**
 * Client-side route guard. Redirects to /login when there is no session, and
 * optionally enforces an allowed set of roles. Used instead of middleware so
 * protection still works when the app is served from cache offline.
 */
export function useRequireAuth(allowedRoles?: Role[]): {
  session: Session | null;
  loading: boolean;
  authorized: boolean;
} {
  const { session, loading } = useAuth();
  const router = useRouter();

  const authorized =
    !!session && (!allowedRoles || allowedRoles.includes(session.role));

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
    } else if (allowedRoles && !allowedRoles.includes(session.role)) {
      router.replace("/home");
    }
  }, [loading, session, allowedRoles, router]);

  return { session, loading, authorized };
}
