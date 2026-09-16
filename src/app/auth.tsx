// Sesi tenant: user dipersist (localStorage) agar PWA standalone langsung masuk; token dikelola lib/http (mode http).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import type { LoginResult, TenantUser } from "@/api/types";
import { setSessionExpiredHandler, tokenStore } from "@/lib/http";
import { loadJSON, removeKey, saveJSON } from "@/lib/storage";

interface AuthState {
  user: TenantUser | null;
  ready: boolean;
  onboarded: boolean;
  login(email: string, password: string): Promise<LoginResult>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
  setOnboarded(): void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<TenantUser | null>(() => loadJSON<TenantUser | null>("user", null));
  const [onboarded, setOnboardedState] = useState<boolean>(() => loadJSON<boolean>("onboarded", false));
  const [ready, setReady] = useState(false);

  const clear = useCallback(() => {
    setUser(null);
    removeKey("user");
    tokenStore.set(null);
    qc.clear();
  }, [qc]);

  useEffect(() => {
    setSessionExpiredHandler(clear);
    // Validasi sesi saat start (mode mock: cek session; http: /tenant/me dengan refresh otomatis).
    let cancelled = false;
    (async () => {
      if (!user) {
        setReady(true);
        return;
      }
      try {
        const me = await api().me();
        if (!cancelled) {
          setUser(me);
          saveJSON("user", me);
        }
      } catch {
        if (!cancelled) clear();
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      onboarded,
      async login(email, password) {
        const res = await api().login(email, password);
        setUser(res.user);
        saveJSON("user", res.user);
        return res;
      },
      async logout() {
        try {
          await api().logout();
        } finally {
          clear();
        }
      },
      async refresh() {
        const me = await api().me();
        setUser(me);
        saveJSON("user", me);
      },
      setOnboarded() {
        setOnboardedState(true);
        saveJSON("onboarded", true);
      },
    }),
    [user, ready, onboarded, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth di luar AuthProvider");
  return v;
}
