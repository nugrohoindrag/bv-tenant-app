// Formatter Indonesia (Naming Convention: tanggal "13 Desember 2019 08:00 WIB", uang "Rp 1.450.000").
import { format, formatDistanceToNowStrict, isToday, isYesterday, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const toDate = (d: string | Date) => (typeof d === "string" ? parseISO(d) : d);

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
