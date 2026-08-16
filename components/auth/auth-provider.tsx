"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api } from "@/lib/api/client";
import type { Entitlement, Session } from "@/lib/api/types";

interface AuthContextValue {
  session: Session | null;
  entitlement: Entitlement | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string, consent?: { termsAccepted: boolean; privacyAccepted: boolean }) => Promise<Session>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  entitlement: null,
  loading: true,
  refresh: async () => {},
  login: async () => { throw new Error("Auth provider belum siap."); },
  logout: async () => {},
});

export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [s, e] = await Promise.all([api.getSession(), api.getEntitlement()]);
      setSession(s); setEntitlement(e);
    } catch {
      setSession(null); setEntitlement(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, e] = await Promise.all([api.getSession(), api.getEntitlement()]);
        if (cancelled) return;
        setSession(s); setEntitlement(e);
      } catch {
        if (cancelled) return;
        setSession(null); setEntitlement(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const onOnline = () => refresh();
    window.addEventListener("online", onOnline);
    return () => { cancelled = true; window.removeEventListener("online", onOnline); };
  }, [refresh]);

  const login = useCallback(async (email: string, password: string, consent?: { termsAccepted: boolean; privacyAccepted: boolean }) => {
    const s = await api.login(email, password, consent);
    await refresh();
    return s;
  }, [refresh]);

  const logout = useCallback(async () => {
    await api.logout();
    setSession(null); setEntitlement(null);
  }, []);

  return <AuthContext.Provider value={{ session, entitlement, loading, refresh, login, logout }}>{children}</AuthContext.Provider>;
}
