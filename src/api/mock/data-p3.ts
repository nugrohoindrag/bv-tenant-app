// Data demo P3/P4 v2.1 (paket, parkir, feedback umum, anggota, preferensi notifikasi) — bentuk = respons backend.
import type { AccessLoc, Member, NotificationPreference, Package, ParkingArea, TenantFeedback, Vehicle, VehicleDocument } from "../types";
import { placeholder } from "./images";

const iso = (offsetMin: number) => new Date(Date.now() + offsetMin * 60_000).toISOString();
const ymd = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Unit kedua demo (P3-UNT-04: pengganti unit aktif bila punya beberapa unit). */
export const SECOND_UNIT: AccessLoc = { id: "fl-pinus-10-u1", access_id: "acc-2", location_type: "unit", name: "Unit APP 1001", code: "UNT-001001", unit_number: "APP 1001", path_text: "Graha Pinus Residence · Tower Pinus · Lantai 10 · Unit APP 1001", is_primary: false, access_type: "unit" };

export const UNIT_DETAILS: Record<string, { unit_type: string; area_m2: number; occupancy_status: string; occupants: { name: string; relation: string | null }[] }> = {
  "fl-pinus-1-u2": { unit_type: "2BR", area_m2: 72, occupancy_status: "occupied", occupants: [{ name: "Yosep Pratama", relation: "Kontak utama" }, { name: "Maria Pratama", relation: null }] },
  "fl-pinus-10-u1": { unit_type: "Studio", area_m2: 36, occupancy_status: "vacant", occupants: [] },
};

export const PACKAGES: Package[] = [
  { id: "pkg-1", package_number: "PKG-2026-000045", unit_location_id: "fl-pinus-1-u2", unit_name: "Unit APP 102", tenant_name: "Yosep Pratama", recipient_name: "Yosep Pratama", package_type: "parcel", courier: "JNE", tracking_number: "JNE0012345678", description: "Kotak sedang, elektronik", storage_location: "Rak B-2 Resepsionis Lobby", status: "notified", received_at: iso(-60 * 26), notified_at: iso(-60 * 26), reminder_count: 1, picked_up_at: null, picked_up_by_name: null, handover_note: null, returned_at: null, return_reason: null, days_waiting: 1, photos: [{ id: "pp-1", attachment_type: "photo", url: placeholder("Paket", "amber", 640, 480) }], allowed_actions: ["view"] },
  { id: "pkg-2", package_number: "PKG-2026-000049", unit_location_id: "fl-pinus-1-u2", unit_name: "Unit APP 102", tenant_name: "Yosep Pratama", recipient_name: "Maria Pratama", package_type: "document", courier: "Pos Indonesia", tracking_number: null, description: "Amplop dokumen bank", storage_location: "Laci dokumen Resepsionis", status: "received", received_at: iso(-45), notified_at: null, reminder_count: 0, picked_up_at: null, picked_up_by_name: null, handover_note: null, returned_at: null, return_reason: null, days_waiting: 0, photos: [], allowed_actions: ["view"] },
  { id: "pkg-3", package_number: "PKG-2026-000031", unit_location_id: "fl-pinus-1-u2", unit_name: "Unit APP 102", tenant_name: "Yosep Pratama", recipient_name: "Yosep Pratama", package_type: "food", courier: "GoSend", tracking_number: null, description: "Makanan", storage_location: "Meja Resepsionis", status: "picked_up", received_at: iso(-60 * 24 * 4), notified_at: iso(-60 * 24 * 4), reminder_count: 0, picked_up_at: iso(-60 * 24 * 4 + 30), picked_up_by_name: "Yosep Pratama", handover_note: null, returned_at: null, return_reason: null, days_waiting: 0, photos: [], allowed_actions: ["view"] },
];

export const PARKING_AREAS: ParkingArea[] = [
  { id: "pa-b1", name: "Basement 1 — Penghuni", code: "B1", area_type: "tenant" },
  { id: "pa-b2", name: "Basement 2 — Campuran", code: "B2", area_type: "mixed" },
];

export const VEHICLES: Vehicle[] = [
  {
    id: "veh-1",
    plate_number: "B 1234 XYZ",
    vehicle_type: "car",
    brand: "Toyota Avanza",
    color: "Hitam",
    unit_location_id: "fl-pinus-1-u2",
    unit_name: "Unit APP 102",
    status: "active",
    permit_until: ymd(75),
    permit_valid: true,
    is_mine: true,
    document_count: 1,
    permits: [
      { id: "pmt-1", permit_number: "PRK-2026-000012", vehicle_id: "veh-1", plate_number: "B 1234 XYZ", vehicle_type: "car", vehicle_label: "Toyota Avanza Hitam", unit_location_id: "fl-pinus-1-u2", unit_name: "Unit APP 102", requested_by_name: "Yosep Pratama", parking_area_id: "pa-b1", parking_area_name: "Basement 1 — Penghuni", permit_type: "annual", status: "approved", is_active: true, valid_from: ymd(-290), valid_until: ymd(75), sticker_number: "STK-0451", fee_amount: 150_000, notes: null, decision_reason: null, decided_at: iso(-60 * 24 * 290), requested_at: iso(-60 * 24 * 292), allowed_actions: ["view"] },
    ],
  },
  {
    id: "veh-2",
    plate_number: "B 4321 ABC",
    vehicle_type: "motorcycle",
    brand: "Honda Vario",
    color: "Putih",
    unit_location_id: "fl-pinus-1-u2",
    unit_name: "Unit APP 102",
    status: "active",
    permit_until: null,
    permit_valid: false,
    is_mine: true,
    document_count: 0,
    permits: [
      { id: "pmt-2", permit_number: "PRK-2026-000031", vehicle_id: "veh-2", plate_number: "B 4321 ABC", vehicle_type: "motorcycle", vehicle_label: "Honda Vario Putih", unit_location_id: "fl-pinus-1-u2", unit_name: "Unit APP 102", requested_by_name: "Yosep Pratama", parking_area_id: "pa-b2", parking_area_name: "Basement 2 — Campuran", permit_type: "monthly", status: "requested", is_active: false, valid_from: ymd(1), valid_until: null, sticker_number: null, fee_amount: null, notes: "Motor untuk harian", decision_reason: null, decided_at: null, requested_at: iso(-60 * 5), allowed_actions: ["view", "cancel"] },
    ],
  },
];

/** Dokumen kendaraan (STNK) per kendaraan — dikirim hanya pada detail kendaraan milik akun. */
export const VEHICLE_DOCUMENTS: Record<string, VehicleDocument[]> = {
  "veh-1": [{ id: "vdoc-1", attachment_type: "photo", file_name: "stnk-b1234xyz.jpg", content_type: "image/jpeg", url: placeholder("STNK B 1234 XYZ", "teal", 960, 600), thumb_url: placeholder("STNK", "teal", 240, 150), uploaded_at: iso(-60 * 24 * 292) }],
};

export const FEEDBACK: TenantFeedback[] = [
  { id: "fb-1", feedback_number: "FDB-2026-000007", category: "suggestion", subject: "Tempat duduk taman", body: "Mohon ditambah tempat duduk di area taman dekat kolam renang.", is_anonymous: false, status: "responded", response: "Terima kasih atas masukannya. Dua bangku taman akan dipasang minggu depan.", responded_at: iso(-60 * 24), created_at: iso(-60 * 24 * 3), photos: [] },
];

export const MEMBERS: Member[] = [
  { tenant_user_id: "tu-yosep", user_id: "user-yosep", full_name: "Yosep Pratama", email: "yosep@demo.buildingvision.id", phone: "081234567890", role: "tenant_admin", status: "active", is_self: true, units: [], last_seen_at: iso(-5), can_manage: false },
  { tenant_user_id: "tu-maria", user_id: "user-maria", full_name: "Maria Pratama", email: "maria@demo.buildingvision.id", phone: "081299990001", role: "tenant_user", status: "active", is_self: false, units: [], last_seen_at: iso(-60 * 30), can_manage: true },
];

const pref = (type: string, category: string, push = true): NotificationPreference => ({ type, inapp: true, push, email: false, email_available: false, category });

export const PREFERENCES: NotificationPreference[] = [
  pref("ticket_created", "request"),
  pref("ticket_status", "request"),
  pref("ticket_need_response", "request"),
  pref("ticket_resolved", "request"),
  pref("ticket_message", "request"),
  pref("invoice_issued", "billing"),
  pref("invoice_due_soon", "billing"),
  pref("invoice_overdue", "billing"),
  pref("payment_received", "billing"),
  pref("announcement", "announcement"),
  pref("announcement_alert", "announcement"),
  pref("booking_confirmed", "booking"),
  pref("visitor_arrived", "visitor", false),
  pref("package_received", "package"),
  pref("package_reminder", "package"),
  pref("parking_permit_approved", "parking"),
  pref("parking_permit_expiring", "parking"),
  pref("tenant_feedback_responded", "feedback"),
];
