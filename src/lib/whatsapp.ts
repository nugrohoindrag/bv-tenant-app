// WhatsApp manual (click-to-chat, tanpa API — PRD P3 v2.1 §6.4, D-P3-05/08): tautan wa.me dengan teks terisi.
// Nomor pengelola per property datang dari /tenant/me (`whatsapp_number`), meta problem login (B-08), atau daftar property registrasi
// publik (`/tenant/registration/properties` → `whatsapp_number`, untuk perangkat baru); disimpan lokal agar layar login (lupa
// password) tetap dapat menampilkannya pada kunjungan berikutnya.
import type { Option } from "@/api/types";
import { loadJSON, saveJSON } from "./storage";

/** Normalisasi nomor ke format internasional (62…) untuk wa.me (P3-WAM-04). Kosong/tidak valid → null. */
export function normalizeWhatsApp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  if (d.length < 9 || d.length > 15) return null;
  return d;
}

/** https://wa.me/{nomor}?text=… atau null bila nomor tidak valid. */
export function waLink(number: string | null | undefined, text?: string): string | null {
  const n = normalizeWhatsApp(number);
  if (!n) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export interface ManagementContact {
  whatsapp_number: string | null;
  property_name: string | null;
}

const KEY = "mgmt-contact";

/** Simpan kontak pengelola terakhir yang diketahui (dari /tenant/me atau meta login). */
export function rememberManagementContact(c: { whatsapp_number?: string | null; property_name?: string | null }) {
  const prev = loadJSON<ManagementContact>(KEY, { whatsapp_number: null, property_name: null });
  const next: ManagementContact = { whatsapp_number: normalizeWhatsApp(c.whatsapp_number) ?? prev.whatsapp_number, property_name: c.property_name ?? prev.property_name };
  saveJSON(KEY, next);
}

/** Kontak pengelola tersimpan di perangkat ini (dari sesi/login sebelumnya); kosong di perangkat baru. */
export function cachedManagementContact(): ManagementContact {
  return loadJSON<ManagementContact>(KEY, { whatsapp_number: null, property_name: null });
}

/** Kontak pengelola untuk layar publik tanpa jaringan: cache lokal → VITE_SUPPORT_WHATSAPP → null. */
export function managementContact(): ManagementContact {
  const c = cachedManagementContact();
  return { whatsapp_number: c.whatsapp_number ?? normalizeWhatsApp(import.meta.env.VITE_SUPPORT_WHATSAPP), property_name: c.property_name };
}

export interface PublicContacts {
  /** Kontak utama (satu tombol) atau null. */
  primary: ManagementContact | null;
  /** Bila belum ada kontak utama dan gedung lebih dari satu: satu tombol per property. */
  options: { property_name: string; whatsapp_number: string }[];
}

/**
 * Kontak pengelola untuk layar publik (login/daftar) di perangkat mana pun: property yang disebut (mis. dari meta login) →
 * cache lokal → satu-satunya nomor di daftar property registrasi → VITE_SUPPORT_WHATSAPP. Bila beberapa property punya nomor
 * berbeda dan tidak ada petunjuk, kembalikan pilihan per property.
 */
export function resolvePublicContacts(cached: ManagementContact, properties: Option[] | undefined, propertyName?: string | null): PublicContacts {
  const withWa = (properties ?? []).flatMap((p) => {
    const n = normalizeWhatsApp(p.whatsapp_number);
    return n ? [{ property_name: p.name, whatsapp_number: n }] : [];
  });
  if (propertyName) {
    const hit = withWa.find((p) => p.property_name.toLowerCase() === propertyName.toLowerCase());
    if (hit) return { primary: hit, options: [] };
  }
  const cachedNumber = normalizeWhatsApp(cached.whatsapp_number);
  if (cachedNumber) return { primary: { whatsapp_number: cachedNumber, property_name: cached.property_name }, options: [] };
  const distinct = new Set(withWa.map((p) => p.whatsapp_number));
  if (distinct.size === 1) return { primary: withWa.length === 1 ? withWa[0]! : { whatsapp_number: withWa[0]!.whatsapp_number, property_name: null }, options: [] };
  const env = normalizeWhatsApp(import.meta.env.VITE_SUPPORT_WHATSAPP);
  if (distinct.size === 0) return { primary: env ? { whatsapp_number: env, property_name: null } : null, options: [] };
  return { primary: null, options: withWa };
}
