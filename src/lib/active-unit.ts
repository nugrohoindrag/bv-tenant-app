// Unit aktif (P3-UNT-04): tenant dengan beberapa unit (`tenant_access`) memilih unit yang ditampilkan di Home & My Unit dan
// dipakai sebagai default form (tamu, kendaraan, masukan). Pilihan disimpan lokal per perangkat; server tetap memvalidasi akses.
import { useSyncExternalStore } from "react";
import type { AccessLoc, TenantUser } from "@/api/types";
import { loadJSON, removeKey, saveJSON } from "./storage";

const KEY = "active-unit";
let current: string | null = loadJSON<string | null>(KEY, null);
const listeners = new Set<() => void>();

export function setActiveUnitId(id: string | null) {
  current = id;
  if (id) saveJSON(KEY, id);
  else removeKey(KEY);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useActiveUnitId(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  );
}

/** Pilih unit aktif dari daftar unit user: pilihan tersimpan (bila masih diakses) → unit utama → unit pertama. */
export function pickActiveUnit(user: Pick<TenantUser, "units" | "primary_unit"> | null | undefined, id: string | null): AccessLoc | null {
  const units = user?.units ?? [];
  return units.find((u) => u.id === id) ?? user?.primary_unit ?? units[0] ?? null;
}

export function useActiveUnit(user: Pick<TenantUser, "units" | "primary_unit"> | null | undefined): AccessLoc | null {
  return pickActiveUnit(user, useActiveUnitId());
}
