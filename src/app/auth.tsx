// Sesi tenant: user dipersist (localStorage) agar PWA standalone langsung masuk; token dikelola lib/http (mode http).
// PRD P3 v2.1: flag wajib ganti password (P3-ACC-03) ikut di user; kontak WhatsApp pengelola disimpan untuk layar login
// (P3-WAM-05); push disinkronkan saat sesi aktif dan perangkat dilepas saat logout (P3-PSH-01..03).
// Password sementara ditegakkan server (403 PASSWORD_CHANGE_REQUIRED): respons itu menandai sesi → RequireAuth mengarahkan ke
// Buat Password Baru; pendaftaran perangkat push (POST /me/devices) baru dijalankan setelah password diganti.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import type { LoginResult, TenantUser } from "@/api/types";
import { setPasswordChangeRequiredHandler, setSessionExpiredHandler, tokenStore } from "@/lib/http";
import { loadJSON, removeKey, saveJSON } from "@/lib/storage";
import { rememberManagementContact } from "@/lib/whatsapp";
import { disablePush, syncPush } from "@/lib/push";

interface AuthState {
  user: TenantUser | null;
  ready: boolean;
  onboarded: boolean;
  login(email: string, password: string): Promise<LoginResult>;
  logout(): Promise<void>;
  refresh(): Promise<TenantUser>;
  /** Simpan user terbaru dari respons server (mis. PATCH /tenant/me). */
  applyUser(u: TenantUser): void;
  setOnboarded(): void;
}

const Ctx = createContext<AuthState | null>(null);

function remember(u: TenantUser) {
  saveJSON("user", u);
  rememberManagementContact({ whatsapp_number: u.whatsapp_number, property_name: u.property?.name });
}

/** Batas waktu langkah pembersihan saat logout agar tombol Keluar tidak menggantung saat offline. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([p, new Promise<undefined>((r) => setTimeout(() => r(undefined), ms))]);
}

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
    // data tenant di cache service worker (NetworkFirst) tidak boleh terbaca akun berikutnya di perangkat yang sama
    if (typeof caches !== "undefined") void caches.delete("bv-tenant-api").catch(() => {});
  }, [qc]);

  useEffect(() => {
    setSessionExpiredHandler(clear);
    setPasswordChangeRequiredHandler(() => {
      setUser((u) => (u && !u.must_change_password ? { ...u, must_change_password: true } : u));
      const saved = loadJSON<TenantUser | null>("user", null);
      if (saved && !saved.must_change_password) saveJSON("user", { ...saved, must_change_password: true });
    });
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
          remember(me);
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

  // Push (POST /me/devices) hanya untuk sesi aktif tanpa password sementara; dijalankan ulang setelah password diganti.
  const userId = user?.id;
  const mustChange = !!user?.must_change_password;
  useEffect(() => {
    if (ready && userId && !mustChange) void syncPush();
  }, [ready, userId, mustChange]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      onboarded,
      async login(email, password) {
        const res = await api().login(email, password);
        const u = { ...res.user, must_change_password: !!(res.must_change_password || res.user.must_change_password) };
        setUser(u);
        remember(u);
        return res;
      },
      async logout() {
        try {
          // lepas perangkat push selagi token sesi masih berlaku
          await withTimeout(disablePush().catch(() => {}), 4000);
          await api().logout();
        } finally {
          clear();
        }
      },
      async refresh() {
        const me = await api().me();
        setUser(me);
        remember(me);
        return me;
      },
      applyUser(u) {
        setUser(u);
        remember(u);
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
