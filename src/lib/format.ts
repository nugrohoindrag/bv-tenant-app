// Formatter Indonesia (Naming Convention: tanggal "13 Desember 2019 08:00 WIB", uang "Rp 1.450.000").
import { format, formatDistanceToNowStrict, isToday, isYesterday, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const toDate = (d: string | Date) => (typeof d === "string" ? parseISO(d) : d);

// Kode contact_preference (disimpan backend apa adanya) → label tenant-facing.
export const CONTACT_PREFERENCES = [
  { value: "app_message", label: "Pesan di aplikasi" },
  { value: "phone", label: "Telepon" },
  { value: "whatsapp", label: "WhatsApp" },
];

export function contactPreferenceLabel(code: string): string {
  return CONTACT_PREFERENCES.find((c) => c.value === code)?.label ?? code;
}

// Jenis permintaan (PRD P1 v2 §27.2) — kode backend `request_type` → label tenant-facing.
export const REQUEST_TYPES = [
  { value: "service_request", label: "Permintaan Layanan" },
  { value: "complaint", label: "Keluhan" },
  { value: "maintenance_request", label: "Perbaikan" },
  { value: "cleaning_request", label: "Kebersihan" },
  { value: "facility_issue", label: "Masalah Fasilitas" },
  { value: "other", label: "Lainnya" },
] as const;

export function requestTypeLabel(code: string | null | undefined): string {
  return REQUEST_TYPES.find((t) => t.value === code)?.label ?? "Permintaan Layanan";
}

export function fmtRupiah(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

export function fmtDate(d: string | Date): string {
  return format(toDate(d), "d MMMM yyyy", { locale: idLocale });
}

export function fmtDateTime(d: string | Date): string {
  return format(toDate(d), "d MMMM yyyy HH:mm", { locale: idLocale }) + " WIB";
}

export function fmtDateTimeComma(d: string | Date): string {
  return format(toDate(d), "d MMMM yyyy, HH:mm", { locale: idLocale }) + " WIB";
}

export function fmtShortDate(d: string | Date): string {
  return format(toDate(d), "dd-MM-yyyy HH:mm", { locale: idLocale });
}

export function fmtRelative(d: string | Date): string {
  const dt = toDate(d);
  if (isToday(dt) || isYesterday(dt)) return formatDistanceToNowStrict(dt, { locale: idLocale, addSuffix: true });
  return fmtDate(dt);
}
