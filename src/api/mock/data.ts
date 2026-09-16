// Data demo adapter mock — bentuk mengikuti respons backend P1 (lihat ../types.ts). Hanya untuk demo/uji layout.
import type { Announcement, Booking, Facility, Invoice, Notification, Option, Payment, SRCategory, ServiceRequest, TenantUser, Visitor } from "../types";
import { placeholder } from "./images";

const iso = (offsetMin: number) => new Date(Date.now() + offsetMin * 60_000).toISOString();
const day = (offsetDays: number, h = 9, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const ORG = { id: "org-demo", slug: "graha-pangeran", name: "PT Graha Pangeran Property" };

export const PROPERTIES: Option[] = [
  { id: "prop-pinus", name: "Graha Pinus Residence", profile: "apartment" },
  { id: "prop-tower", name: "Menara Pangeran Office", profile: "office" },
];
export const FLOORS: Option[] = [
  { id: "fl-pinus-1", name: "Lantai 1", parent_id: "prop-pinus" },
  { id: "fl-pinus-10", name: "Lantai 10", parent_id: "prop-pinus" },
  { id: "fl-tower-12", name: "Lantai 12", parent_id: "prop-tower" },
];
export const UNITS: Option[] = [
  { id: "fl-pinus-1-u1", name: "Unit APP 101", code: "APP 101", parent_id: "fl-pinus-1" },
  { id: "fl-pinus-1-u2", name: "Unit APP 102", code: "APP 102", parent_id: "fl-pinus-1" },
  { id: "fl-pinus-10-u1", name: "Unit APP 1001", code: "APP 1001", parent_id: "fl-pinus-10" },
  { id: "fl-tower-12-u1", name: "Unit A-1201", code: "A-1201", parent_id: "fl-tower-12" },
];

export const DEMO_PASSWORD = "Demo12345!";
export const DEMO_USER: TenantUser = {
  id: "user-yosep",
  tenant_user_id: "tu-yosep",
  full_name: "Yosep Pratama",
  email: "yosep@demo.buildingvision.id",
  phone: "081234567890",
  role: "tenant_admin",
  account_status: "active",
  ownership_status: "owner",
  organization: ORG,
  property: {
    id: "prop-pinus",
    name: "Graha Pinus Residence",
    code: "PROP-000001",
    profile: "apartment",
    timezone: "Asia/Jakarta",
    terminology: {
      customer: { id: "Penghuni", en: "Resident" },
      customer_plural: { id: "Penghuni", en: "Residents" },
      occupant: { id: "Penghuni", en: "Resident" },
      relation_module: { id: "Resident Relation", en: "Resident Relation" },
      request: { id: "Permintaan Penghuni", en: "Resident Request" },
      my_unit: { id: "Unit Saya", en: "My Unit" },
      inventory_unit: { id: "Unit", en: "Unit" },
    },
  },
  tenant: { id: "ten-1", name: "Yosep Pratama", code: "TEN-000012" },
  units: [{ id: "fl-pinus-1-u2", access_id: "acc-1", location_type: "unit", name: "Unit APP 102", code: "UNT-000102", unit_number: "APP 102", path_text: "Graha Pinus Residence · Tower Pinus · Lantai 1 · Unit APP 102", is_primary: true }],
  areas: [],
  primary_unit: { id: "fl-pinus-1-u2", access_id: "acc-1", location_type: "unit", name: "Unit APP 102", code: "UNT-000102", unit_number: "APP 102", path_text: "Graha Pinus Residence · Tower Pinus · Lantai 1 · Unit APP 102", is_primary: true },
  features: { expose_sla: true, confirmation_required: true, csat_enabled: true, booking_approval_required: false, visitor_approval_required: false },
  capabilities: ["tenant_relation", "facility_booking", "visitor_management", "billing", "tenant_app"],
  last_seen_at: null,
};

export const CATEGORIES: SRCategory[] = [
  { code: "plumbing", name: "Plumbing", icon: "plumbing", default_priority: "high" },
  { code: "electrical", name: "Electrical", icon: "electrical", default_priority: "high" },
  { code: "ac", name: "Air Conditioning", icon: "ac", default_priority: "medium" },
  { code: "cleaning", name: "Cleanliness", icon: "cleaning", default_priority: "medium" },
  { code: "security", name: "Security", icon: "security", default_priority: "high" },
  { code: "lift", name: "Lift", icon: "lift", default_priority: "high" },
  { code: "facility", name: "Facility", icon: "facility", default_priority: "medium" },
  { code: "noise", name: "Noise", icon: "noise", default_priority: "low" },
  { code: "pest", name: "Pest", icon: "pest", default_priority: "medium" },
  { code: "building_damage", name: "Building Damage", icon: "building", default_priority: "high" },
  { code: "other", name: "Other", icon: "other", default_priority: "low" },
];

const base = (o: Partial<ServiceRequest> & Pick<ServiceRequest, "id" | "request_number" | "title" | "category_code" | "status" | "tenant_status">): ServiceRequest => ({
  description: null,
  category_name: CATEGORIES.find((c) => c.code === o.category_code)?.name ?? null,
  category_icon: CATEGORIES.find((c) => c.code === o.category_code)?.icon ?? null,
  priority: "medium",
  area_scope: "unit",
  location: { id: "fl-pinus-1-u2", name: "Unit APP 102", path_text: "Tower Pinus · Lantai 1 · Unit APP 102" },
  property_name: "Graha Pinus Residence",
  assigned_team: null,
  created_at: iso(-60),
  acknowledged_at: null,
  resolved_at: null,
  closed_at: null,
  cancelled_at: null,
  confirmed_at: null,
  due_estimate_at: null,
  resolution: null,
  reopen_count: 0,
  contact_preference: null,
  preferred_visit_at: null,
  additional_note: null,
  photos: [],
  message_count: 0,
  unread_messages: 0,
  feedback: null,
  timeline: [],
  allowed_actions: [],
  version: 1,
  ...o,
});

export const SERVICE_REQUESTS: ServiceRequest[] = [
  base({
    id: "sr-1001",
    request_number: "SR-2026-000101",
    title: "Langit-langit kamar kotor",
    description: "Langit-langit kamar utama kotor, banyak sarang laba-laba di sudut.",
    category_code: "cleaning",
    status: "resolved",
    tenant_status: "resolved",
    assigned_team: "Housekeeping Team",
    created_at: iso(-60 * 26),
    acknowledged_at: iso(-60 * 25),
    resolved_at: iso(-60 * 2),
    resolution: "Sudah dibersihkan menyeluruh termasuk sudut plafon.",
    photos: [{ id: "ph-1", kind: "problem", url: placeholder("Plafon", "slate", 640, 480) }, { id: "ph-2", kind: "resolution", url: placeholder("Setelah", "green", 640, 480) }],
    message_count: 1,
    timeline: [
      { id: "t1", key: "submitted", title: "Ticket dikirim", actor_kind: "tenant", occurred_at: iso(-60 * 26) },
      { id: "t2", key: "received", title: "Diterima building management", actor_kind: "staff", occurred_at: iso(-60 * 25) },
      { id: "t3", key: "in_progress", title: "Sedang dikerjakan", actor_kind: "staff", occurred_at: iso(-60 * 5) },
      { id: "t4", key: "resolved", title: "Selesai dikerjakan", detail: "Sudah dibersihkan menyeluruh termasuk sudut plafon.", actor_kind: "staff", occurred_at: iso(-60 * 2) },
    ],
    allowed_actions: ["confirm", "reopen", "message"],
  }),
  base({
    id: "sr-1002",
    request_number: "SR-2026-000118",
    title: "AC kamar tidak dingin",
    description: "AC kamar utama tidak dingin sejak semalam, hanya keluar angin.",
    category_code: "ac",
    status: "in_progress",
    tenant_status: "in_progress",
    priority: "high",
    assigned_team: "Engineering Team",
    created_at: iso(-60 * 4),
    acknowledged_at: iso(-60 * 3),
    due_estimate_at: iso(60 * 20),
    timeline: [
      { id: "t1", key: "submitted", title: "Ticket dikirim", actor_kind: "tenant", occurred_at: iso(-60 * 4) },
      { id: "t2", key: "received", title: "Diterima building management", actor_kind: "staff", occurred_at: iso(-60 * 3) },
      { id: "t3", key: "in_progress", title: "Sedang dikerjakan", actor_kind: "staff", occurred_at: iso(-30) },
    ],
    allowed_actions: ["message"],
  }),
  base({
    id: "sr-1003",
    request_number: "SR-2026-000120",
    title: "Lampu koridor lantai 1 mati",
    category_code: "electrical",
    status: "waiting_for_tenant",
    tenant_status: "need_your_response",
    area_scope: "common_area",
    location: { id: "area-corr-1", name: "Koridor Lantai 1", path_text: "Tower Pinus · Lantai 1 · Koridor" },
    created_at: iso(-60 * 30),
    acknowledged_at: iso(-60 * 29),
    message_count: 2,
    unread_messages: 1,
    timeline: [
      { id: "t1", key: "submitted", title: "Ticket dikirim", actor_kind: "tenant", occurred_at: iso(-60 * 30) },
      { id: "t2", key: "received", title: "Diterima building management", actor_kind: "staff", occurred_at: iso(-60 * 29) },
      { id: "t3", key: "need_your_response", title: "Butuh respons Anda", detail: "Mohon konfirmasi titik lampu yang dimaksud.", actor_kind: "staff", occurred_at: iso(-60 * 10) },
    ],
    allowed_actions: ["message", "cancel"],
  }),
];

export const FACILITIES: Facility[] = [
  { id: "fac-mr1", facility_code: "FCL-2026-000001", name: "Meeting Room A", description: "Ruang rapat 10 orang, TV & whiteboard.", facility_type: "meeting_room", location_path: "Tower Pinus · Lantai GF", capacity: 10, effective_approval: false, slot_minutes: 60, min_duration_minutes: 60, max_duration_minutes: 240, advance_booking_days: 14, open_time: "08:00", close_time: "20:00", weekdays: [1, 2, 3, 4, 5, 6], rules: "Tidak boleh membawa makanan berat.", is_active: true },
  { id: "fac-gym", facility_code: "FCL-2026-000002", name: "Gym", description: "Fitness center lantai 3.", facility_type: "gym", location_path: "Tower Pinus · Lantai 3", capacity: 15, effective_approval: false, slot_minutes: 60, min_duration_minutes: 60, max_duration_minutes: 120, advance_booking_days: 7, open_time: "06:00", close_time: "22:00", weekdays: [0, 1, 2, 3, 4, 5, 6], rules: null, is_active: true },
  { id: "fac-bbq", facility_code: "FCL-2026-000003", name: "BBQ Area", description: "Area BBQ rooftop, perlu persetujuan pengelola.", facility_type: "function_hall", location_path: "Rooftop", capacity: 30, effective_approval: true, slot_minutes: 60, min_duration_minutes: 120, max_duration_minutes: 300, advance_booking_days: 30, open_time: "16:00", close_time: "22:00", weekdays: [5, 6, 0], rules: "Bersihkan area setelah dipakai.", is_active: true },
];

export const BOOKINGS: Booking[] = [
  { id: "bk-1", booking_number: "BKG-2026-000031", facility_id: "fac-mr1", facility_name: "Meeting Room A", facility_type: "meeting_room", starts_at: day(0, 15), ends_at: day(0, 16), attendees: 6, purpose: "Rapat warga", notes: null, status: "confirmed", rejection_reason: null, cancel_reason: null, created_at: iso(-60 * 40), allowed_actions: ["cancel"] },
  { id: "bk-2", booking_number: "BKG-2026-000029", facility_id: "fac-gym", facility_name: "Gym", facility_type: "gym", starts_at: day(-3, 7), ends_at: day(-3, 8), attendees: 1, purpose: null, notes: null, status: "completed", rejection_reason: null, cancel_reason: null, created_at: iso(-60 * 24 * 4), allowed_actions: [] },
];

export const VISITORS: Visitor[] = [
  { id: "vis-1", visitor_number: "VIS-2026-000210", host_unit_label: "Unit APP 102", visitor_name: "Rina Kartika", visitor_phone: "0813-2222-1111", visitor_company: null, purpose: "Kunjungan keluarga", vehicle_plate: "B 1234 XY", headcount: 2, expected_at: day(1, 14), expected_until: day(1, 18), status: "registered", denied_reason: null, checked_in_at: null, checked_out_at: null, created_at: iso(-60 * 3), pass: { id: "pass-1", pass_code: "VP-8K3Q2", qr_payload: "BV|VIS-2026-000210|VP-8K3Q2", valid_from: day(1, 13), valid_until: day(1, 19), status: "active", used_at: null }, allowed_actions: ["cancel"] },
  { id: "vis-2", visitor_number: "VIS-2026-000198", host_unit_label: "Unit APP 102", visitor_name: "Kurir Paket", visitor_phone: null, visitor_company: "JNE", purpose: "Antar paket", vehicle_plate: null, headcount: 1, expected_at: day(-2, 10), expected_until: null, status: "checked_out", denied_reason: null, checked_in_at: day(-2, 10, 12), checked_out_at: day(-2, 10, 25), created_at: iso(-60 * 24 * 3), pass: null, allowed_actions: [] },
];

export const INVOICES: Invoice[] = [
  { id: "inv-1", invoice_number: "INV-2026-000341", unit_label: "Unit APP 102", invoice_type: "service_charge", period_start: day(-15), period_end: day(15), description: "Service charge September 2026", currency_code: "IDR", subtotal_amount: 1_450_000, tax_amount: 0, total_amount: 1_450_000, paid_amount: 0, outstanding_amount: 1_450_000, issued_at: iso(-60 * 24 * 5), due_at: day(4), paid_at: null, status: "issued", items: [{ description: "Service charge 72 m² × Rp 17.500", quantity: 72, unit: "m²", unit_price: 17_500, amount: 1_260_000 }, { description: "Sinking fund", quantity: 1, unit: null, unit_price: 190_000, amount: 190_000 }], payment_count: 0, allowed_actions: ["pay"] },
  { id: "inv-2", invoice_number: "INV-2026-000298", unit_label: "Unit APP 102", invoice_type: "utility", period_start: day(-45), period_end: day(-15), description: "Listrik & air Agustus 2026", currency_code: "IDR", subtotal_amount: 620_000, tax_amount: 0, total_amount: 620_000, paid_amount: 620_000, outstanding_amount: 0, issued_at: iso(-60 * 24 * 35), due_at: day(-26), paid_at: day(-28), status: "paid", items: [{ description: "Listrik 310 kWh", quantity: 310, unit: "kWh", unit_price: 1_500, amount: 465_000 }, { description: "Air 31 m³", quantity: 31, unit: "m³", unit_price: 5_000, amount: 155_000 }], payment_count: 1, allowed_actions: [] },
];

export const PAYMENTS: Payment[] = [
  { id: "pay-1", payment_number: "PAY-2026-000120", invoice_id: "inv-2", invoice_number: "INV-2026-000298", amount: 620_000, currency_code: "IDR", provider_code: "mock_gateway", method: "va", status: "paid", checkout_url: null, va_number: "8808123456789", qr_string: null, instructions: null, expires_at: null, paid_at: day(-28), receipt_number: "RCP-2026-000088", failure_reason: null, created_at: day(-28) },
];

export const NOTIFICATIONS: Notification[] = [
  { id: "n-1", type: "ticket_need_response", title: "Butuh Respons Anda", body: "SR-2026-000120 — Mohon konfirmasi titik lampu yang dimaksud.", object_type: "service_request", object_id: "sr-1003", deep_link: "/requests/sr-1003", severity: "warning", created_at: iso(-60 * 10), read_at: null },
  { id: "n-2", type: "ticket_resolved", title: "Ticket Resolved", body: "SR-2026-000101 — Langit-langit kamar kotor. Mohon konfirmasi hasil pekerjaan.", object_type: "service_request", object_id: "sr-1001", deep_link: "/requests/sr-1001", severity: "success", created_at: iso(-60 * 2), read_at: null },
  { id: "n-3", type: "booking_confirmed", title: "Booking Confirmed", body: "Meeting Room A hari ini 15:00–16:00.", object_type: "booking", object_id: "bk-1", deep_link: "/facilities/bookings/bk-1", severity: "info", created_at: iso(-60 * 40), read_at: iso(-60 * 39) },
  { id: "n-4", type: "invoice_issued", title: "Invoice Issued", body: "INV-2026-000341 Rp 1.450.000 jatuh tempo 4 hari lagi.", object_type: "invoice", object_id: "inv-1", deep_link: "/bills/inv-1", severity: "info", created_at: iso(-60 * 24 * 5), read_at: iso(-60 * 24 * 4) },
];

export const ANNOUNCEMENTS: Announcement[] = [
  { id: "an-1", title: "Pemeliharaan lift Tower Pinus", excerpt: "Lift B dimatikan Sabtu 09:00–12:00 untuk servis rutin.", body: "Lift B Tower Pinus akan dimatikan pada Sabtu pukul 09:00–12:00 untuk pemeliharaan rutin.\n\nSilakan gunakan Lift A selama periode tersebut. Mohon maaf atas ketidaknyamanannya.", importance: "important", published_at: iso(-60 * 24 * 1), expires_at: null, image_url: placeholder("Lift", "navy") },
  { id: "an-2", title: "Fogging nyamuk area taman", excerpt: "Fogging dilakukan Minggu pagi; tutup jendela unit Anda.", body: "Fogging area taman dan koridor akan dilakukan Minggu pukul 06:00–08:00.\n\nMohon menutup jendela dan tidak berada di area taman selama fogging berlangsung.", importance: "normal", published_at: iso(-60 * 24 * 3), expires_at: null, image_url: placeholder("Taman", "green") },
];
