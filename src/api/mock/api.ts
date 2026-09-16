// Implementasi mock TenantApi: state di localStorage (bvt:mock:*), latensi buatan. Bentuk data = respons backend P1.
// Akun demo: yosep@demo.buildingvision.id / Demo12345! (aktif). Registrasi → pending_validation; `mockApproveAll()` menyimulasikan
// validasi Tenant Relation (hanya mode mock). Aturan status di sini SEDERHANA — sumber kebenaran tetap server.
import type { TenantApi } from "..";
import type { Booking, Invoice, LoginResult, Message, Notification, Payment, RegisterInput, ServiceRequest, Slot, TenantUser, TimelineEvent, Visitor } from "../types";
import { ApiError } from "@/lib/http";
import { loadJSON, removeKey, saveJSON } from "@/lib/storage";
import { sleep, uuid } from "@/lib/utils";
import { ANNOUNCEMENTS, BOOKINGS, CATEGORIES, DEMO_PASSWORD, DEMO_USER, FACILITIES, FLOORS, INVOICES, NOTIFICATIONS, PAYMENTS, PROPERTIES, SERVICE_REQUESTS, UNITS, VISITORS } from "./data";

interface MockUser extends TenantUser {
  password: string;
}

interface MockState {
  users: MockUser[];
  session: string | null;
  srs: ServiceRequest[];
  messages: Record<string, Message[]>;
  bookings: Booking[];
  visitors: Visitor[];
  invoices: Invoice[];
  payments: Payment[];
  notifications: Notification[];
  idem: Record<string, string>;
  seq: number;
}

const KEY = "mock:state";
const LATENCY = 300;
const TENANT_STATUS: Record<string, ServiceRequest["tenant_status"]> = { new: "submitted", acknowledged: "received", assigned: "being_assigned", in_progress: "in_progress", waiting_for_tenant: "need_your_response", resolved: "resolved", closed: "closed", cancelled: "cancelled" };

function fresh(): MockState {
  return {
    users: [{ ...DEMO_USER, password: DEMO_PASSWORD }],
    session: null,
    srs: structuredClone(SERVICE_REQUESTS),
    messages: { "sr-1003": [{ id: "m-1", author_kind: "staff", author_name: "Building Management", body: "Mohon konfirmasi titik lampu yang dimaksud (dekat lift atau ujung koridor?).", attachment_ids: [], created_at: new Date(Date.now() - 600_000).toISOString(), read_at: null }] },
    bookings: structuredClone(BOOKINGS),
    visitors: structuredClone(VISITORS),
    invoices: structuredClone(INVOICES),
    payments: structuredClone(PAYMENTS),
    notifications: structuredClone(NOTIFICATIONS),
    idem: {},
    seq: 130,
  };
}

let state: MockState = loadJSON<MockState | null>(KEY, null) ?? fresh();
function persist() {
  saveJSON(KEY, state);
}

export function resetMock() {
  state = fresh();
  removeKey(KEY);
  removeKey("tokens");
}

/** Simulasi validasi akun oleh Tenant Relation (mode mock). */
export function mockApproveAll(): number {
  let n = 0;
  for (const u of state.users) {
    if (u.account_status === "pending_validation") {
      u.account_status = "active";
      n++;
    }
  }
  persist();
  return n;
}

function problem(status: number, code: string, detail: string, errors?: { field: string; message: string }[]): ApiError {
  return new ApiError({ type: "about:blank", title: code, status, code, detail, errors });
}

function requireUser(): MockUser {
  const u = state.users.find((x) => x.id === state.session);
  if (!u) throw problem(401, "UNAUTHORIZED", "Sesi berakhir. Silakan login kembali.");
  return u;
}

function strip(u: MockUser): TenantUser {
  const { password: _pw, ...rest } = u;
  return rest;
}

function notify(n: Omit<Notification, "id" | "created_at" | "read_at">) {
  state.notifications.unshift({ ...n, id: uuid(), created_at: new Date().toISOString(), read_at: null });
}

function tl(sr: ServiceRequest, key: string, title: string, actor: TimelineEvent["actor_kind"], detail?: string | null) {
  sr.timeline = [...(sr.timeline ?? []), { id: uuid(), key, title, detail: detail ?? null, actor_kind: actor, occurred_at: new Date().toISOString() }];
}

function setStatus(sr: ServiceRequest, status: ServiceRequest["status"]) {
  sr.status = status;
  sr.tenant_status = TENANT_STATUS[status];
  sr.version++;
  const now = new Date().toISOString();
  if (status === "resolved") sr.resolved_at = now;
  if (status === "closed") sr.closed_at = now;
  if (status === "cancelled") sr.cancelled_at = now;
  // allowed_actions dihitung "server": tenant hanya confirm/reopen/feedback/cancel/message
  const a: string[] = [];
  if (["new", "acknowledged", "assigned", "in_progress", "waiting_for_tenant"].includes(status)) a.push("message");
  if (["new", "acknowledged"].includes(status)) a.push("cancel");
  if (status === "resolved") a.push("confirm", "reopen", "message");
  if (status === "closed" && !sr.feedback) a.push("feedback"); // CSAT hanya setelah Closed (sama dengan server)
  sr.allowed_actions = a;
}

function findSR(id: string): ServiceRequest {
  const sr = state.srs.find((x) => x.id === id);
  if (!sr) throw problem(404, "NOT_FOUND", "Ticket tidak ditemukan");
  return sr;
}

function requireAction(item: { allowed_actions: string[]; status: string }, action: string) {
  if (!item.allowed_actions.includes(action)) throw problem(409, "INVALID_TRANSITION", `Aksi ${action} tidak tersedia pada status ${item.status}`);
}

export const mockApi: TenantApi = {
  mode: "mock",

  async login(email, password): Promise<LoginResult> {
    await sleep(LATENCY);
    const u = state.users.find((x) => x.email?.toLowerCase() === email.trim().toLowerCase());
    if (!u || u.password !== password) throw problem(401, "INVALID_CREDENTIALS", "Email atau password salah.");
    if (u.account_status === "pending_validation") throw problem(403, "ACCOUNT_PENDING", "Akun Anda belum divalidasi building management.");
    if (u.account_status === "rejected") throw problem(403, "ACCOUNT_REJECTED", "Pendaftaran akun Anda ditolak. Hubungi building management.");
    if (u.account_status === "suspended") throw problem(403, "ACCOUNT_SUSPENDED", "Akun Anda ditangguhkan.");
    state.session = u.id;
    u.last_seen_at = new Date().toISOString();
    persist();
    return { user: strip(u), access_token: "mock-" + u.id, refresh_token: "mock-refresh" };
  },

  async register(input: RegisterInput) {
    await sleep(LATENCY);
    const errors: { field: string; message: string }[] = [];
    if (state.users.some((x) => x.email?.toLowerCase() === input.email.toLowerCase())) errors.push({ field: "email", message: "Email sudah terdaftar" });
    if (input.password.length < 8) errors.push({ field: "password", message: "Minimal 8 karakter" });
    const unit = UNITS.find((x) => x.id === input.unit_id);
    if (!unit) errors.push({ field: "unit_id", message: "Unit tidak ditemukan" });
    if (errors.length) throw problem(400, "VALIDATION_ERROR", "Periksa kembali isian Anda.", errors);
    const prop = PROPERTIES.find((p) => p.id === input.property_id) ?? PROPERTIES[0];
    const id = "user-" + uuid().slice(0, 8);
    const loc = { id: unit!.id, access_id: uuid(), location_type: "unit", name: unit!.name, code: unit!.code ?? "", unit_number: unit!.code, path_text: `${prop.name} · ${unit!.name}`, is_primary: true };
    state.users.push({
      ...DEMO_USER,
      id,
      tenant_user_id: "tu-" + id,
      full_name: `${input.first_name} ${input.last_name}`.trim(),
      email: input.email,
      phone: input.phone,
      role: "tenant_user",
      account_status: "pending_validation",
      ownership_status: input.ownership_status,
      property: { ...DEMO_USER.property, id: prop.id, name: prop.name, profile: (prop.profile as TenantUser["property"]["profile"]) ?? "apartment" },
      tenant: null,
      units: [loc],
      primary_unit: loc,
      password: input.password,
      last_seen_at: null,
    });
    persist();
    return { tenant_user_id: "tu-" + id, user_id: id, account_status: "pending_validation" as const, message: "Pendaftaran diterima. Akun akan aktif setelah divalidasi building management." };
  },

  async me() {
    await sleep(120);
    return strip(requireUser());
  },
  async updateMe(input) {
    await sleep(LATENCY);
    const u = requireUser();
    if (input.full_name) u.full_name = input.full_name;
    if (input.phone !== undefined) u.phone = input.phone;
    persist();
    return strip(u);
  },
  async logout() {
    state.session = null;
    persist();
  },
  async changePassword(current, next) {
    await sleep(LATENCY);
    const u = requireUser();
    if (u.password !== current) throw problem(400, "VALIDATION_ERROR", "Password saat ini salah.", [{ field: "current_password", message: "Password salah" }]);
    if (next.length < 8) throw problem(400, "VALIDATION_ERROR", "Minimal 8 karakter", [{ field: "new_password", message: "Minimal 8 karakter" }]);
    u.password = next;
    persist();
  },

  async properties() {
    await sleep(150);
    return PROPERTIES;
  },
  async floors(propertyId) {
    await sleep(150);
    return FLOORS.filter((f) => f.parent_id === propertyId);
  },
  async units(_propertyId, floorId) {
    await sleep(150);
    return UNITS.filter((u) => u.parent_id === floorId);
  },

  async categories() {
    await sleep(120);
    return CATEGORIES;
  },
  async locations() {
    await sleep(120);
    const u = requireUser();
    return [
      ...u.units.map((x) => ({ id: x.id, location_type: "unit", name: x.name, path_text: x.path_text, scope: "unit" as const, is_primary: x.is_primary })),
      { id: "area-lobby", location_type: "area", name: "Lobby", path_text: "Tower Pinus · Lantai GF · Lobby", scope: "common_area" as const, is_primary: false },
      { id: "area-corr-1", location_type: "area", name: "Koridor Lantai 1", path_text: "Tower Pinus · Lantai 1 · Koridor", scope: "common_area" as const, is_primary: false },
      { id: "area-parking", location_type: "area", name: "Parkir Basement", path_text: "Tower Pinus · B1 · Parkir", scope: "common_area" as const, is_primary: false },
      { id: "area-pool", location_type: "area", name: "Kolam Renang", path_text: "Tower Pinus · Lantai 3 · Kolam Renang", scope: "common_area" as const, is_primary: false },
    ];
  },

  async createServiceRequest(input) {
    await sleep(LATENCY * 2);
    requireUser();
    const existing = state.idem[input.idempotency_key];
    if (existing) return findSR(existing);
    const cat = CATEGORIES.find((c) => c.code === input.category_code);
    if (!cat) throw problem(400, "VALIDATION_ERROR", "Kategori tidak dikenal", [{ field: "category_code", message: "tidak dikenal" }]);
    if (input.description.trim().length < 10) throw problem(400, "VALIDATION_ERROR", "Deskripsi minimal 10 karakter", [{ field: "description", message: "minimal 10 karakter" }]);
    const id = "sr-" + uuid().slice(0, 8);
    const number = `SR-${new Date().getFullYear()}-${String(++state.seq).padStart(6, "0")}`;
    const sr: ServiceRequest = {
      ...SERVICE_REQUESTS[0],
      id,
      request_number: number,
      title: input.title || input.description.slice(0, 60),
      description: input.description,
      category_code: cat.code,
      category_name: cat.name,
      category_icon: cat.icon,
      status: "new",
      tenant_status: "submitted",
      priority: cat.default_priority ?? "medium",
      area_scope: input.area_scope,
      location: { id: input.location_id, name: input.location_label, path_text: input.location_label },
      assigned_team: null,
      created_at: new Date().toISOString(),
      acknowledged_at: null,
      resolved_at: null,
      closed_at: null,
      cancelled_at: null,
      confirmed_at: null,
      due_estimate_at: new Date(Date.now() + 24 * 3_600_000).toISOString(),
      resolution: null,
      reopen_count: 0,
      contact_preference: input.contact_preference ?? null,
      preferred_visit_at: input.preferred_visit_at ?? null,
      additional_note: input.additional_note ?? null,
      photos: input.photos.map((b, i) => ({ id: "ph-" + i + "-" + id, kind: "problem", url: URL.createObjectURL(b) })),
      message_count: 0,
      unread_messages: 0,
      feedback: null,
      timeline: [],
      allowed_actions: [],
      version: 1,
    };
    tl(sr, "submitted", "Ticket dikirim", "tenant");
    setStatus(sr, "new");
    state.srs.unshift(sr);
    state.idem[input.idempotency_key] = id;
    notify({ type: "ticket_created", title: "Ticket Created", body: `${number} — ${sr.title}`, object_type: "service_request", object_id: id, deep_link: `/requests/${id}`, severity: "info" });
    persist();
    return sr;
  },

  async serviceRequests(params) {
    await sleep(LATENCY);
    requireUser();
    const statuses = params?.status ? params.status.split(",") : null;
    let rows = state.srs;
    if (statuses) rows = rows.filter((s) => statuses.includes(s.status));
    if (params?.open) rows = rows.filter((s) => !["closed", "cancelled"].includes(s.status));
    if (params?.q) rows = rows.filter((s) => (s.title + s.request_number).toLowerCase().includes(params.q!.toLowerCase()));
    return { data: rows.map((s) => ({ ...s, timeline: undefined })), next_cursor: null };
  },
  async serviceRequest(id) {
    await sleep(200);
    requireUser();
    return findSR(id);
  },
  async confirmRequest(id) {
    await sleep(LATENCY);
    const sr = findSR(id);
    requireAction(sr, "confirm");
    sr.confirmed_at = new Date().toISOString();
    tl(sr, "closed", "Anda mengonfirmasi hasil pekerjaan", "tenant");
    setStatus(sr, "closed");
    persist();
    return sr;
  },
  async reopenRequest(id, reason, photos) {
    await sleep(LATENCY);
    const sr = findSR(id);
    requireAction(sr, "reopen");
    sr.reopen_count++;
    sr.photos.push(...photos.map((b, i) => ({ id: "rp-" + i + "-" + uuid().slice(0, 4), kind: "reopen", url: URL.createObjectURL(b) })));
    tl(sr, "reopened", "Ticket dibuka kembali", "tenant", reason);
    setStatus(sr, "in_progress");
    notify({ type: "ticket_reopened", title: "Ticket Reopened", body: `${sr.request_number} dibuka kembali`, object_type: "service_request", object_id: id, deep_link: `/requests/${id}`, severity: "warning" });
    persist();
    return sr;
  },
  async cancelRequest(id, reason) {
    await sleep(LATENCY);
    const sr = findSR(id);
    requireAction(sr, "cancel");
    tl(sr, "cancelled", "Ticket dibatalkan", "tenant", reason);
    setStatus(sr, "cancelled");
    persist();
    return sr;
  },
  async sendFeedback(id, rating, comment) {
    await sleep(LATENCY);
    const sr = findSR(id);
    requireAction(sr, "feedback");
    sr.feedback = { rating, comment: comment || null, created_at: new Date().toISOString() };
    sr.allowed_actions = sr.allowed_actions.filter((a) => a !== "feedback");
    persist();
    return sr;
  },
  async messages(id) {
    await sleep(150);
    const sr = findSR(id);
    sr.unread_messages = 0;
    persist();
    return state.messages[id] ?? [];
  },
  async sendMessage(id, body) {
    await sleep(LATENCY);
    const sr = findSR(id);
    requireAction(sr, "message");
    const m: Message = { id: uuid(), author_kind: "tenant", author_name: requireUser().full_name, body, attachment_ids: [], created_at: new Date().toISOString(), read_at: null };
    state.messages[id] = [...(state.messages[id] ?? []), m];
    sr.message_count++;
    if (sr.status === "waiting_for_tenant") {
      tl(sr, "in_progress", "Respons Anda diterima; pekerjaan dilanjutkan", "system");
      setStatus(sr, "in_progress");
    }
    persist();
    return m;
  },

  async facilities() {
    await sleep(150);
    requireUser();
    return FACILITIES;
  },
  async facilityAvailability(id, date) {
    await sleep(200);
    const f = FACILITIES.find((x) => x.id === id);
    if (!f) throw problem(404, "NOT_FOUND", "Fasilitas tidak ditemukan");
    const [oh] = f.open_time.split(":").map(Number);
    const [ch] = f.close_time.split(":").map(Number);
    const slots: Slot[] = [];
    for (let h = oh; h < ch; h++) {
      const s = new Date(`${date}T${String(h).padStart(2, "0")}:00:00`);
      const e = new Date(s.getTime() + 3_600_000);
      const booked = state.bookings.some((b) => b.facility_id === id && !["cancelled", "rejected"].includes(b.status) && new Date(b.starts_at) < e && new Date(b.ends_at) > s);
      const past = e.getTime() < Date.now();
      slots.push({ starts_at: s.toISOString(), ends_at: e.toISOString(), available: !booked && !past, reason: booked ? "booked" : past ? "past" : undefined });
    }
    return slots;
  },
  async bookings(params) {
    await sleep(LATENCY);
    requireUser();
    let rows = [...state.bookings].sort((a, b) => b.starts_at.localeCompare(a.starts_at));
    if (params?.upcoming) rows = rows.filter((b) => new Date(b.ends_at) > new Date() && ["pending", "confirmed", "checked_in"].includes(b.status));
    return rows;
  },
  async booking(id) {
    await sleep(150);
    const b = state.bookings.find((x) => x.id === id);
    if (!b) throw problem(404, "NOT_FOUND", "Booking tidak ditemukan");
    return b;
  },
  async createBooking(input) {
    await sleep(LATENCY);
    requireUser();
    const f = FACILITIES.find((x) => x.id === input.facility_id);
    if (!f) throw problem(404, "NOT_FOUND", "Fasilitas tidak ditemukan");
    const s = new Date(input.starts_at);
    const e = new Date(input.ends_at);
    if (state.bookings.some((b) => b.facility_id === f.id && !["cancelled", "rejected"].includes(b.status) && new Date(b.starts_at) < e && new Date(b.ends_at) > s)) throw problem(409, "SLOT_UNAVAILABLE", "Slot sudah dipesan.");
    const b: Booking = { id: "bk-" + uuid().slice(0, 8), booking_number: `BKG-${new Date().getFullYear()}-${String(++state.seq).padStart(6, "0")}`, facility_id: f.id, facility_name: f.name, facility_type: f.facility_type, starts_at: input.starts_at, ends_at: input.ends_at, attendees: input.attendees ?? null, purpose: input.purpose ?? null, notes: input.notes ?? null, status: f.effective_approval ? "pending" : "confirmed", rejection_reason: null, cancel_reason: null, created_at: new Date().toISOString(), allowed_actions: ["cancel"] };
    state.bookings.unshift(b);
    notify({ type: f.effective_approval ? "booking_pending" : "booking_confirmed", title: f.effective_approval ? "Booking Pending" : "Booking Confirmed", body: `${f.name} ${s.toLocaleString("id-ID")}`, object_type: "booking", object_id: b.id, deep_link: `/facilities/bookings/${b.id}`, severity: "info" });
    persist();
    return b;
  },
  async cancelBooking(id, reason) {
    await sleep(LATENCY);
    const b = await this.booking(id);
    requireAction(b, "cancel");
    b.status = "cancelled";
    b.cancel_reason = reason;
    b.allowed_actions = [];
    persist();
    return b;
  },

  async visitors(params) {
    await sleep(LATENCY);
    requireUser();
    let rows = [...state.visitors].sort((a, b) => b.expected_at.localeCompare(a.expected_at));
    if (params?.upcoming) rows = rows.filter((v) => ["pending_approval", "registered", "checked_in"].includes(v.status));
    return rows;
  },
  async visitor(id) {
    await sleep(150);
    const v = state.visitors.find((x) => x.id === id);
    if (!v) throw problem(404, "NOT_FOUND", "Tamu tidak ditemukan");
    return v;
  },
  async createVisitor(input) {
    await sleep(LATENCY);
    const u = requireUser();
    if (!input.visitor_name.trim()) throw problem(400, "VALIDATION_ERROR", "Nama tamu wajib", [{ field: "visitor_name", message: "wajib" }]);
    const code = "VP-" + uuid().slice(0, 5).toUpperCase();
    const number = `VIS-${new Date().getFullYear()}-${String(++state.seq).padStart(6, "0")}`;
    const approval = u.features.visitor_approval_required;
    const v: Visitor = { id: "vis-" + uuid().slice(0, 8), visitor_number: number, host_unit_label: u.primary_unit?.name ?? null, visitor_name: input.visitor_name, visitor_phone: input.visitor_phone ?? null, visitor_company: input.visitor_company ?? null, purpose: input.purpose ?? null, vehicle_plate: input.vehicle_plate ?? null, headcount: input.headcount ?? 1, expected_at: input.expected_at, expected_until: input.expected_until ?? null, status: approval ? "pending_approval" : "registered", denied_reason: null, checked_in_at: null, checked_out_at: null, created_at: new Date().toISOString(), pass: approval ? null : { id: uuid(), pass_code: code, qr_payload: `BV|${number}|${code}`, valid_from: new Date(new Date(input.expected_at).getTime() - 3_600_000).toISOString(), valid_until: input.expected_until ?? new Date(new Date(input.expected_at).getTime() + 12 * 3_600_000).toISOString(), status: "active", used_at: null }, allowed_actions: ["cancel"] };
    state.visitors.unshift(v);
    persist();
    return v;
  },
  async cancelVisitor(id, _reason) {
    await sleep(LATENCY);
    const v = await this.visitor(id);
    requireAction(v, "cancel");
    v.status = "cancelled";
    v.allowed_actions = [];
    if (v.pass) v.pass.status = "revoked";
    persist();
    return v;
  },

  async billSummary() {
    await sleep(200);
    requireUser();
    const open = state.invoices.filter((i) => ["issued", "partially_paid", "overdue"].includes(i.status));
    const next = open.map((i) => i.due_at).sort()[0] ?? null;
    return { outstanding_amount: open.reduce((a, i) => a + i.outstanding_amount, 0), unpaid_count: open.length, overdue_count: open.filter((i) => i.status === "overdue").length, next_due_at: next, currency_code: "IDR" };
  },
  async bills(params) {
    await sleep(LATENCY);
    requireUser();
    let rows = [...state.invoices].sort((a, b) => b.due_at.localeCompare(a.due_at));
    if (params?.open) rows = rows.filter((i) => ["issued", "partially_paid", "overdue"].includes(i.status));
    return rows;
  },
  async bill(id) {
    await sleep(150);
    const b = state.invoices.find((x) => x.id === id);
    if (!b) throw problem(404, "NOT_FOUND", "Tagihan tidak ditemukan");
    return b;
  },
  async paymentProviders() {
    await sleep(120);
    return [
      { code: "manual", name: "Transfer Bank (verifikasi manual)", is_active: true, methods: ["transfer"], config: { instructions: "Transfer ke BCA 123-456-7890 a.n. PT Graha Pangeran Property, lalu konfirmasi ke building management." } },
      { code: "mock_gateway", name: "Payment Gateway (demo)", is_active: true, methods: ["va", "qris"], config: {} },
    ];
  },
  async payBill(id, providerCode, method) {
    await sleep(LATENCY);
    const inv = await this.bill(id);
    if (inv.outstanding_amount <= 0) throw problem(409, "INVOICE_NOT_PAYABLE", "Tagihan sudah lunas.");
    if (state.payments.some((p) => p.invoice_id === id && ["initiated", "pending"].includes(p.status))) throw problem(409, "PAYMENT_PENDING", "Masih ada pembayaran yang menunggu.");
    const p: Payment = { id: "pay-" + uuid().slice(0, 8), payment_number: `PAY-${new Date().getFullYear()}-${String(++state.seq).padStart(6, "0")}`, invoice_id: id, invoice_number: inv.invoice_number, amount: inv.outstanding_amount, currency_code: "IDR", provider_code: providerCode, method, status: providerCode === "manual" ? "pending" : "initiated", checkout_url: null, va_number: method === "va" ? "8808" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0") : null, qr_string: method === "qris" ? "00020101021226..." : null, instructions: providerCode === "manual" ? "Transfer ke BCA 123-456-7890 a.n. PT Graha Pangeran Property." : null, expires_at: new Date(Date.now() + 24 * 3_600_000).toISOString(), paid_at: null, receipt_number: null, failure_reason: null, created_at: new Date().toISOString() };
    state.payments.unshift(p);
    inv.payment_count++;
    persist();
    return p;
  },
  async payments(invoiceId) {
    await sleep(150);
    requireUser();
    return invoiceId ? state.payments.filter((p) => p.invoice_id === invoiceId) : state.payments;
  },
  async payment(id) {
    await sleep(150);
    const p = state.payments.find((x) => x.id === id);
    if (!p) throw problem(404, "NOT_FOUND", "Pembayaran tidak ditemukan");
    return p;
  },

  async notifications() {
    await sleep(200);
    requireUser();
    return state.notifications;
  },
  async markRead(id) {
    const n = state.notifications.find((x) => x.id === id);
    if (n && !n.read_at) n.read_at = new Date().toISOString();
    persist();
  },
  async markAllRead() {
    for (const n of state.notifications) if (!n.read_at) n.read_at = new Date().toISOString();
    persist();
  },
  async unreadCount() {
    if (!state.session) return 0;
    return state.notifications.filter((n) => !n.read_at).length;
  },
  async announcements() {
    await sleep(150);
    requireUser();
    return { data: ANNOUNCEMENTS, next_cursor: null };
  },
  async announcement(id) {
    await sleep(120);
    const a = ANNOUNCEMENTS.find((x) => x.id === id);
    if (!a) throw problem(404, "NOT_FOUND", "Pengumuman tidak ditemukan");
    return a;
  },
};
