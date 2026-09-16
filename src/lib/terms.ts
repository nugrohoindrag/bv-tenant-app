// Terminologi profile (NC v2.0 §7 "Profile-Specific User Terminology") dari /tenant/me — presentation layer saja.
import type { TenantUser } from "@/api/types";

const DEFAULTS: Record<string, string> = {
  customer: "Tenant",
  occupant: "Penghuni",
  relation_module: "Tenant Relation",
  request: "Ticket",
  my_unit: "Unit Saya",
  inventory_unit: "Unit",
  stay: "Hunian",
};

export function term(user: TenantUser | null | undefined, key: string, lang: "id" | "en" = "id"): string {
  const t = user?.property?.terminology?.[key];
  return (t ? t[lang] : undefined) || DEFAULTS[key] || key;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

export function fmtTime(d: string | Date): string {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function fmtDayShort(d: string | Date): string {
  const x = typeof d === "string" ? new Date(d) : d;
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (x.toDateString() === today.toDateString()) return "Hari ini";
  if (x.toDateString() === tomorrow.toDateString()) return "Besok";
  return x.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
}
