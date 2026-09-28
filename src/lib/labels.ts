// Label tenant-facing (Bahasa Indonesia) untuk kode backend objek P3/P4 v2.1. Status tetap dari status-map (generated).
import type { NotificationPreference, PreferenceCategory } from "@/api/types";

export const OWNERSHIP_LABEL: Record<string, string> = { owner: "Pemilik", tenant: "Penyewa", family: "Keluarga", guest: "Tamu", employee: "Karyawan" };
export const OCCUPANCY_LABEL: Record<string, string> = { occupied: "Dihuni", vacant: "Kosong", reserved: "Dipesan", renovation: "Renovasi", maintenance: "Perbaikan", owner_occupied: "Dihuni pemilik", rented: "Disewakan" };
export const PERSON_ROLE_LABEL: Record<string, string> = { occupant: "Penghuni terdaftar", tenant_user: "Pengguna aplikasi", tenant_admin: "Admin tenant" };

export const ANNOUNCEMENT_CATEGORY: Record<string, string> = { announcement: "Pengumuman", news: "Kabar Gedung", alert: "Penting" };
export const ANNOUNCEMENT_FILTERS: { key: "" | "announcement" | "news" | "alert"; label: string }[] = [
  { key: "", label: "Semua" },
  { key: "announcement", label: "Pengumuman" },
  { key: "news", label: "News" },
  { key: "alert", label: "Alert" },
];

/** Gaya kartu pengumuman per kategori/severity: alert & critical menonjol (menggantikan cek `importance === "urgent"` yang mati). */
export function announcementTone(a: { category?: string | null; severity?: string | null }): "critical" | "warning" | "info" {
  if (a.severity === "critical") return "critical";
  if (a.category === "alert" || a.severity === "warning") return "warning";
  return "info";
}

export const PACKAGE_TYPE: Record<string, string> = { document: "Dokumen", parcel: "Paket", food: "Makanan", large: "Barang besar", other: "Lainnya" };
export const VEHICLE_TYPE: Record<string, string> = { car: "Mobil", motorcycle: "Motor", truck: "Truk", bicycle: "Sepeda", other: "Lainnya" };
export const PERMIT_TYPE: Record<string, string> = { monthly: "Bulanan", annual: "Tahunan", temporary: "Sementara" };
export const FEEDBACK_CATEGORY: Record<string, string> = { suggestion: "Saran", compliment: "Pujian", complaint: "Keluhan", question: "Pertanyaan", other: "Lainnya" };
export const STATEMENT_KIND: Record<string, string> = { invoice: "Tagihan", void: "Pembatalan", credit_note: "Koreksi tagihan", payment: "Pembayaran", refund: "Refund", credit: "Saldo kredit" };

export const PREF_CATEGORY_LABEL: Record<PreferenceCategory, string> = {
  request: "Permintaan",
  billing: "Tagihan & Pembayaran",
  announcement: "Pengumuman",
  booking: "Booking Fasilitas",
  visitor: "Tamu",
  package: "Paket",
  parking: "Parkir",
  account: "Akun",
  feedback: "Masukan",
  other: "Lainnya",
};
const PREF_ORDER: PreferenceCategory[] = ["request", "billing", "announcement", "package", "parking", "booking", "visitor", "feedback", "account", "other"];

export const NOTIF_TYPE_LABEL: Record<string, string> = {
  ticket_created: "Permintaan terkirim",
  ticket_status: "Perubahan status permintaan",
  ticket_need_response: "Permintaan butuh respons Anda",
  ticket_resolved: "Permintaan selesai dikerjakan",
  ticket_closed: "Permintaan ditutup",
  ticket_reopened: "Permintaan dibuka kembali",
  ticket_message: "Pesan dari pengelola",
  tenant_account_approved: "Akun disetujui",
  tenant_account_rejected: "Akun ditolak",
  tenant_account_suspended: "Akun ditangguhkan",
  announcement: "Pengumuman & kabar gedung",
  announcement_alert: "Pemberitahuan penting / darurat",
  booking_confirmed: "Booking dikonfirmasi",
  booking_rejected: "Booking ditolak",
  booking_cancelled: "Booking dibatalkan",
  visitor_approved: "Tamu disetujui",
  visitor_denied: "Tamu ditolak",
  visitor_arrived: "Tamu tiba",
  visitor_left: "Tamu keluar",
  invoice_issued: "Tagihan terbit",
  invoice_due_soon: "Tagihan segera jatuh tempo",
  invoice_overdue: "Tagihan lewat jatuh tempo",
  invoice_paid: "Tagihan lunas",
  invoice_reminder: "Pengingat tagihan",
  invoice_cancelled: "Tagihan dibatalkan",
  payment_received: "Pembayaran diterima",
  payment_failed: "Pembayaran gagal",
  payment_refunded: "Pembayaran dikembalikan",
  credit_note_approved: "Koreksi tagihan",
  rental_activated: "Sewa aktif",
  rental_completed: "Sewa berakhir",
  tenant_feedback_responded: "Tanggapan atas masukan",
  package_received: "Paket tiba",
  package_reminder: "Pengingat paket belum diambil",
  package_picked_up: "Paket sudah diambil",
  package_returned: "Paket dikembalikan",
  parking_permit_approved: "Izin parkir disetujui",
  parking_permit_rejected: "Izin parkir ditolak",
  parking_permit_revoked: "Izin parkir dicabut",
  parking_permit_expiring: "Izin parkir segera berakhir",
  parking_permit_expired: "Izin parkir berakhir",
  parking_violation: "Pelanggaran parkir",
};

export function notifTypeLabel(type: string): string {
  return NOTIF_TYPE_LABEL[type] ?? type.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/** Kelompokkan preferensi per `category` (server) dengan urutan tetap untuk layar preferensi (P3-ACC-09). */
export function groupPreferences(prefs: NotificationPreference[]): { category: PreferenceCategory; label: string; items: NotificationPreference[] }[] {
  const by = new Map<PreferenceCategory, NotificationPreference[]>();
  for (const p of prefs) {
    const c = (PREF_ORDER.includes(p.category as PreferenceCategory) ? p.category : "other") as PreferenceCategory;
    by.set(c, [...(by.get(c) ?? []), p]);
  }
  return PREF_ORDER.filter((c) => by.has(c)).map((c) => ({ category: c, label: PREF_CATEGORY_LABEL[c], items: by.get(c)! }));
}
