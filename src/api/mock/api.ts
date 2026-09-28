// Implementasi mock TenantApi: state di localStorage (bvt:mock:*), latensi buatan. Bentuk data = respons backend.
// Akun demo: yosep@demo.buildingvision.id / Demo12345! (aktif, Tenant Admin, 2 unit). Registrasi → pending_validation; `mockApproveAll()`
// menyimulasikan validasi Tenant Relation (hanya mode mock). Akun tambahan: ditolak@demo.buildingvision.id (ditolak + alasan) dan
// sementara@demo.buildingvision.id / Sementara123 (password sementara → wajib ganti). Aturan status di sini SEDERHANA — sumber
// kebenaran tetap server.
import type { TenantApi } from "..";
import type {
  Announcement,
  Booking,
  DocumentLink,
  Invoice,
  LoginResult,
  Member,
  Message,
  Notification,
  NotificationPreference,
  Package,
  ParkingPermit,
  Payment,
  PaymentProof,
  RegisterInput,
  ServiceRequest,
  Slot,
  Statement,
  StatementEntry,
  TenantFeedback,
  TenantUser,
  TimelineEvent,
  UnitSummary,
  Vehicle,
  VehicleDocument,
  Visitor,
} from "../types";
import { ApiError, PASSWORD_CHANGE_REQUIRED, reportProblem } from "@/lib/http";
import { loadJSON, removeKey, saveJSON } from "@/lib/storage";
import { sleep, uuid } from "@/lib/utils";
import { ANNOUNCEMENTS, BOOKINGS, CATEGORIES, DEMO_PASSWORD, DEMO_USER, FACILITIES, FLOORS, INVOICES, NOTIFICATIONS, PAYMENTS, PROPERTIES, SERVICE_REQUESTS, UNITS, VISITORS } from "./data";
import { FEEDBACK, MEMBERS, PACKAGES, PARKING_AREAS, PREFERENCES, SECOND_UNIT, UNIT_DETAILS, VEHICLE_DOCUMENTS, VEHICLES } from "./data-p3";

interface MockUser extends TenantUser {
  password: string;
  rejection_reason?: string;
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
  announcements: Announcement[];
  packages: Package[];
  vehicles: Vehicle[];
  vehicleDocs: Record<string, VehicleDocument[]>;
  feedback: TenantFeedback[];
  members: Member[];
  prefs: NotificationPreference[];
  proofs: Record<string, PaymentProof[]>;
  devices: string[];
  idem: Record<string, string>;
  seq: number;
}

const KEY = "mock:state";
const LATENCY = 300;
/** Latensi buatan untuk demo; 0 saat test (vitest MODE=test) agar suite cepat & tidak bergantung waktu. */
const wait = (ms: number) => sleep(import.meta.env.MODE === "test" ? 0 : ms);
const TENANT_STATUS: Record<string, ServiceRequest["tenant_status"]> = { new: "submitted", acknowledged: "received", assigned: "being_assigned", in_progress: "in_progress", waiting_for_tenant: "need_your_response", resolved: "resolved", closed: "closed", cancelled: "cancelled" };
const MOCK_WHATSAPP = "6281100001234";

function fresh(): MockState {
  const demo: MockUser = { ...structuredClone(DEMO_USER), units: [...structuredClone(DEMO_USER.units), structuredClone(SECOND_UNIT)], password: DEMO_PASSWORD, whatsapp_number: MOCK_WHATSAPP, is_tenant_admin: true, must_change_password: false };
  return {
    users: [
      demo,
      { ...structuredClone(DEMO_USER), id: "user-ditolak", tenant_user_id: "tu-ditolak", full_name: "Rudi Hartono", email: "ditolak@demo.buildingvision.id", role: "tenant_user", account_status: "rejected", password: DEMO_PASSWORD, rejection_reason: "Data unit tidak sesuai dengan daftar penghuni.", whatsapp_number: MOCK_WHATSAPP },
      { ...structuredClone(DEMO_USER), id: "user-sementara", tenant_user_id: "tu-sementara", full_name: "Sinta Maharani", email: "sementara@demo.buildingvision.id", role: "tenant_user", password: "Sementara123", must_change_password: true, is_tenant_admin: false, whatsapp_number: MOCK_WHATSAPP },
    ],
    session: null,
    srs: structuredClone(SERVICE_REQUESTS),
    messages: { "sr-1003": [{ id: "m-1", author_kind: "staff", author_name: "Building Management", body: "Mohon konfirmasi titik lampu yang dimaksud (dekat lift atau ujung koridor?).", attachment_ids: [], attachments: [], created_at: new Date(Date.now() - 600_000).toISOString(), read_at: null }] },
    bookings: structuredClone(BOOKINGS),
    visitors: structuredClone(VISITORS),
    invoices: structuredClone(INVOICES),
    payments: structuredClone(PAYMENTS),
    notifications: structuredClone(NOTIFICATIONS),
    announcements: structuredClone(ANNOUNCEMENTS),
    packages: structuredClone(PACKAGES),
    vehicles: structuredClone(VEHICLES),
    vehicleDocs: structuredClone(VEHICLE_DOCUMENTS),
    feedback: structuredClone(FEEDBACK),
    members: structuredClone(MEMBERS),
    prefs: structuredClone(PREFERENCES),
    proofs: {},
    devices: [],
    idem: {},
    seq: 130,
  };
}

// State lama (versi sebelumnya) dilengkapi field baru agar tidak crash setelah pembaruan.
let state: MockState = { ...fresh(), ...loadJSON<Partial<MockState> | null>(KEY, null) };
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

function problem(status: number, code: string, detail: string, errors?: { field: string; message: string }[], meta?: Record<string, unknown>): ApiError {
  return new ApiError({ type: "about:blank", title: code, status, code, detail, errors, meta });
}

/**
 * Sesi aktif. Seperti server, akun berpassword sementara ditolak 403 PASSWORD_CHANGE_REQUIRED kecuali endpoint yang
 * dikecualikan (GET /tenant/me, POST /me/password, GET /push/config) — panggil dengan `allowTempPassword`.
 */
function requireUser(allowTempPassword = false): MockUser {
  const u = state.users.find((x) => x.id === state.session);
  if (!u) throw problem(401, "UNAUTHORIZED", "Sesi berakhir. Silakan login kembali.");
  if (u.must_change_password && !allowTempPassword) throw reportProblem(problem(403, PASSWORD_CHANGE_REQUIRED, "Ganti password sementara terlebih dahulu."));
  return u;
}

function strip(u: MockUser): TenantUser {
  const { password: _pw, rejection_reason: _rr, ...rest } = u;
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

const blobUrl = (b: Blob) => (typeof URL !== "undefined" && typeof URL.createObjectURL === "function" ? URL.createObjectURL(b) : "about:blank");
const nextNumber = (prefix: string) => `${prefix}-${new Date().getFullYear()}-${String(++state.seq).padStart(6, "0")}`;
const ymdToday = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** PDF satu halaman sederhana (mode demo) agar tombol "Unduh PDF" tetap dapat dicoba tanpa server. */
function mockPdfLink(title: string): DocumentLink {
  const text = title.replace(/[()\\]/g, "");
  const pdf = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length ${44 + text.length}>>stream\nBT /F1 18 Tf 60 780 Td (${text} - mode demo) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF`;
  return { url: blobUrl(new Blob([pdf], { type: "application/pdf" })), expires_at: new Date(Date.now() + 72 * 3_600_000).toISOString(), file_name: title + ".pdf" };
}

function paymentActions(p: Payment): Payment {
  const a = ["view"];
  if (p.status === "paid") a.push("download_receipt");
  if ((p.status === "pending" || p.status === "initiated") && p.provider_code === "manual") a.push("upload_proof");
  return { ...p, allowed_actions: a, proof_count: state.proofs[p.id]?.length ?? p.proof_count ?? 0 };
}

function unitSummary(u: MockUser, unitId: string): UnitSummary {
  const unit = u.units.find((x) => x.id === unitId);
  if (!unit) throw problem(404, "NOT_FOUND", "Unit tidak ditemukan");
  const det = UNIT_DETAILS[unit.id] ?? { unit_type: "Unit", area_m2: 0, occupancy_status: "occupied", occupants: [] };
  const now = Date.now();
  const open = ["issued", "partially_paid", "overdue"];
  const unitInvoices = state.invoices.filter((i) => open.includes(i.status) && (i.unit_label === unit.name || (unit.is_primary && !i.unit_label)));
  return {
    unit,
    unit_type: det.unit_type,
    area_m2: det.area_m2,
    occupancy_status: det.occupancy_status,
    // seperti server: kepemilikan hanya melekat pada unit utama akun; unit lain null
    ownership_status: unit.is_primary ? u.ownership_status : null,
    tenant: u.tenant ? { id: u.tenant.id, name: u.tenant.name, code: u.tenant.code } : null,
    // penghuni terdaftar (tanpa duplikat nama pemegang akun) + akun ini
    people: [
      ...det.occupants.filter((o) => o.name.toLowerCase() !== u.full_name.toLowerCase()).map((o) => ({ name: o.name, role: "occupant", relation: o.relation, is_self: false })),
      { name: u.full_name, role: u.role, relation: unit.is_primary ? u.ownership_status : null, is_self: true },
    ],
    other_access: u.areas,
    counts: {
      open_requests: state.srs.filter((s) => s.location.id === unit.id && !["closed", "cancelled"].includes(s.status)).length,
      unpaid_invoices: unitInvoices.length,
      outstanding_amount: unitInvoices.reduce((a, i) => a + i.outstanding_amount, 0),
      // booking mock tidak membawa unit → dihitung pada unit utama saja (server: per unit)
      upcoming_bookings: unit.is_primary ? state.bookings.filter((b) => new Date(b.starts_at).getTime() > now && ["pending", "confirmed"].includes(b.status)).length : 0,
      upcoming_visitors: state.visitors.filter((v) => v.host_unit_label === unit.name && ["pending_approval", "registered"].includes(v.status)).length,
      packages_waiting: state.packages.filter((p) => p.unit_location_id === unit.id && ["received", "notified"].includes(p.status)).length,
      active_parking_permits: state.vehicles.filter((v) => v.unit_location_id === unit.id).flatMap((v) => v.permits).filter((p) => p.status === "approved" && p.is_active).length,
    },
  };
}

function findVehicle(id: string): Vehicle {
  const v = state.vehicles.find((x) => x.id === id && x.status !== "inactive");
  if (!v) throw problem(404, "NOT_FOUND", "Kendaraan tidak ditemukan");
  return v;
}

function addVehicleDoc(v: Vehicle, file: Blob, fileName?: string) {
  const contentType = file.type || "image/jpeg";
  const url = blobUrl(file);
  const doc: VehicleDocument = { id: "vdoc-" + uuid().slice(0, 8), attachment_type: contentType.startsWith("image/") ? "photo" : "document", file_name: fileName ?? null, content_type: contentType, url, thumb_url: contentType.startsWith("image/") ? url : undefined, uploaded_at: new Date().toISOString() };
  state.vehicleDocs[v.id] = [...(state.vehicleDocs[v.id] ?? []), doc];
  v.document_count = state.vehicleDocs[v.id]!.length;
}

function findPermit(id: string): ParkingPermit {
  for (const v of state.vehicles) {
    const p = v.permits.find((x) => x.id === id);
    if (p) return p;
  }
  throw problem(404, "NOT_FOUND", "Izin parkir tidak ditemukan");
}

function findMember(id: string): Member {
  const m = state.members.find((x) => x.tenant_user_id === id);
  if (!m) throw problem(404, "NOT_FOUND", "Anggota tidak ditemukan");
  return m;
}

function requireAdmin(u: MockUser) {
  if (!u.is_tenant_admin) throw problem(403, "FORBIDDEN", "Hanya Tenant Admin yang dapat mengelola anggota tenant");
}

export const mockApi: TenantApi = {
  mode: "mock",

  async login(email, password): Promise<LoginResult> {
    await wait(LATENCY);
    const u = state.users.find((x) => x.email?.toLowerCase() === email.trim().toLowerCase());
    if (!u || u.password !== password) throw problem(401, "INVALID_CREDENTIALS", "Email atau password salah.");
    const meta = { account_status: u.account_status, property_name: u.property.name, whatsapp_number: u.whatsapp_number ?? undefined, reason: u.account_status === "rejected" ? u.rejection_reason : u.account_status === "suspended" ? "Ditangguhkan oleh building management" : undefined };
    if (u.account_status === "pending_validation") throw problem(403, "ACCOUNT_PENDING", "Akun menunggu validasi building management", undefined, meta);
    if (u.account_status === "rejected") throw problem(403, "ACCOUNT_REJECTED", "Pendaftaran akun ditolak", undefined, meta);
    if (u.account_status === "suspended") throw problem(403, "ACCOUNT_SUSPENDED", "Akun ditangguhkan; hubungi building management", undefined, meta);
    state.session = u.id;
    u.last_seen_at = new Date().toISOString();
    persist();
    return { user: strip(u), access_token: "mock-" + u.id, refresh_token: "mock-refresh", must_change_password: !!u.must_change_password };
  },

  async register(input: RegisterInput) {
    await wait(LATENCY);
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
      whatsapp_number: MOCK_WHATSAPP,
      is_tenant_admin: false,
    });
    persist();
    return { tenant_user_id: "tu-" + id, user_id: id, account_status: "pending_validation" as const, message: "Pendaftaran diterima. Akun akan aktif setelah divalidasi building management." };
  },

  async me() {
    await wait(120);
    return strip(requireUser(true));
  },
  async updateMe(input) {
    await wait(LATENCY);
    const u = requireUser();
    if (input.full_name !== undefined && !input.full_name.trim()) throw problem(400, "VALIDATION_ERROR", "full_name tidak boleh kosong", [{ field: "full_name", message: "wajib" }]);
    if (input.full_name) u.full_name = input.full_name.trim();
    // phone "" mengosongkan nomor (server → null)
    if (input.phone !== undefined) u.phone = input.phone.trim() || null;
    persist();
    return strip(u);
  },
  async logout() {
    state.session = null;
    persist();
  },
  async changePassword(current, next) {
    await wait(LATENCY);
    const u = requireUser(true);
    if (u.password !== current) throw problem(400, "VALIDATION_ERROR", "Password saat ini salah.", [{ field: "current_password", message: "Password salah" }]);
    if (next.length < 8) throw problem(400, "VALIDATION_ERROR", "Minimal 8 karakter", [{ field: "new_password", message: "Minimal 8 karakter" }]);
    u.password = next;
    u.must_change_password = false;
    persist();
  },

  async properties() {
    await wait(150);
    return PROPERTIES;
  },
  async floors(propertyId) {
    await wait(150);
    return FLOORS.filter((f) => f.parent_id === propertyId);
  },
  async units(_propertyId, floorId) {
    await wait(150);
    return UNITS.filter((u) => u.parent_id === floorId);
  },

  async myUnits() {
    await wait(200);
    const u = requireUser();
    return [...u.units].sort((a, b) => Number(b.is_primary) - Number(a.is_primary)).map((x) => unitSummary(u, x.id));
  },
  async myUnit(id) {
    await wait(150);
    return unitSummary(requireUser(), id);
  },

  async members() {
    await wait(200);
    const u = requireUser();
    requireAdmin(u);
    return state.members.map((m) => ({ ...m, units: m.units.length ? m.units : m.is_self ? u.units : u.units.filter((x) => x.is_primary) }));
  },
  async createMember(input) {
    await wait(LATENCY);
    const u = requireUser();
    requireAdmin(u);
    if (!input.full_name.trim()) throw problem(400, "VALIDATION_ERROR", "Nama wajib diisi", [{ field: "full_name", message: "wajib" }]);
    if (!/^\S+@\S+\.\S+$/.test(input.email)) throw problem(400, "VALIDATION_ERROR", "Email tidak valid", [{ field: "email", message: "tidak valid" }]);
    if (state.members.some((m) => m.email?.toLowerCase() === input.email.toLowerCase())) throw problem(409, "EMAIL_EXISTS", "Email sudah terdaftar", [{ field: "email", message: "sudah terdaftar" }]);
    const unitIds = input.unit_ids?.length ? input.unit_ids : u.units.filter((x) => x.is_primary).map((x) => x.id);
    const m: Member = { tenant_user_id: "tu-" + uuid().slice(0, 8), user_id: "user-" + uuid().slice(0, 8), full_name: input.full_name.trim(), email: input.email.trim(), phone: input.phone?.trim() || null, role: "tenant_user", status: "active", is_self: false, units: u.units.filter((x) => unitIds.includes(x.id)), last_seen_at: null, can_manage: true };
    state.members.push(m);
    persist();
    return { member: m, temporary_password: "Bv" + Math.random().toString(36).slice(2, 8) + "7!" };
  },
  async deactivateMember(id) {
    await wait(LATENCY);
    requireAdmin(requireUser());
    const m = findMember(id);
    if (!m.can_manage) throw problem(403, "FORBIDDEN", "Anggota ini tidak dapat dikelola");
    if (m.status !== "active") throw problem(409, "INVALID_TRANSITION", "Anggota sudah tidak aktif");
    m.status = "suspended";
    persist();
    return m;
  },
  async reactivateMember(id) {
    await wait(LATENCY);
    requireAdmin(requireUser());
    const m = findMember(id);
    if (m.status !== "suspended") throw problem(409, "MEMBER_NOT_REACTIVATABLE", "Hanya anggota yang dinonaktifkan Tenant Admin yang dapat diaktifkan kembali");
    m.status = "active";
    persist();
    return m;
  },
  async setMemberUnits(id, unitIds) {
    await wait(LATENCY);
    const u = requireUser();
    requireAdmin(u);
    const m = findMember(id);
    if (unitIds.some((x) => !u.units.some((y) => y.id === x))) throw problem(400, "VALIDATION_ERROR", "unit_ids hanya boleh unit yang Anda kelola", [{ field: "unit_ids", message: "tidak valid" }]);
    m.units = u.units.filter((x) => unitIds.includes(x.id)).map((x, i) => ({ ...x, is_primary: i === 0 }));
    persist();
    return m;
  },

  async categories() {
    await wait(120);
    return CATEGORIES;
  },
  async locations() {
    await wait(120);
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
    await wait(LATENCY * 2);
    requireUser();
    const existing = state.idem[input.idempotency_key];
    if (existing) return findSR(existing);
    const cat = CATEGORIES.find((c) => c.code === input.category_code);
    if (!cat) throw problem(400, "VALIDATION_ERROR", "Kategori tidak dikenal", [{ field: "category_code", message: "tidak dikenal" }]);
    if (input.description.trim().length < 10) throw problem(400, "VALIDATION_ERROR", "Deskripsi minimal 10 karakter", [{ field: "description", message: "minimal 10 karakter" }]);
    const id = "sr-" + uuid().slice(0, 8);
    const num = nextNumber("SR");
    const sr: ServiceRequest = {
      ...SERVICE_REQUESTS[0],
      id,
      request_number: num,
      title: input.title || input.description.slice(0, 60),
      description: input.description,
      category_code: cat.code,
      category_name: cat.name,
      category_icon: cat.icon,
      request_type: input.request_type ?? cat.request_type ?? "service_request",
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
      photos: input.photos.map((b, i) => ({ id: "ph-" + i + "-" + id, kind: "problem", url: blobUrl(b) })),
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
    notify({ type: "ticket_created", title: "Ticket Created", body: `${num} — ${sr.title}`, object_type: "service_request", object_id: id, deep_link: `/requests/${id}`, severity: "info" });
    persist();
    return sr;
  },

  async serviceRequests(params) {
    await wait(LATENCY);
    requireUser();
    const statuses = params?.status ? params.status.split(",") : null;
    let rows = state.srs;
    if (statuses) rows = rows.filter((s) => statuses.includes(s.status));
    if (params?.open) rows = rows.filter((s) => !["closed", "cancelled"].includes(s.status));
    if (params?.q) rows = rows.filter((s) => (s.title + s.request_number).toLowerCase().includes(params.q!.toLowerCase()));
    return { data: rows.map((s) => ({ ...s, timeline: undefined })), next_cursor: null };
  },
  async serviceRequest(id) {
    await wait(200);
    requireUser();
    return findSR(id);
  },
  async confirmRequest(id) {
    await wait(LATENCY);
    const sr = findSR(id);
    requireAction(sr, "confirm");
    sr.confirmed_at = new Date().toISOString();
    tl(sr, "closed", "Anda mengonfirmasi hasil pekerjaan", "tenant");
    setStatus(sr, "closed");
    persist();
    return sr;
  },
  async reopenRequest(id, reason, photos) {
    await wait(LATENCY);
    const sr = findSR(id);
    requireAction(sr, "reopen");
    sr.reopen_count++;
    sr.photos.push(...photos.map((b, i) => ({ id: "rp-" + i + "-" + uuid().slice(0, 4), kind: "reopen", url: blobUrl(b) })));
    tl(sr, "reopened", "Ticket dibuka kembali", "tenant", reason);
    setStatus(sr, "in_progress");
    notify({ type: "ticket_reopened", title: "Ticket Reopened", body: `${sr.request_number} dibuka kembali`, object_type: "service_request", object_id: id, deep_link: `/requests/${id}`, severity: "warning" });
    persist();
    return sr;
  },
  async cancelRequest(id, reason) {
    await wait(LATENCY);
    const sr = findSR(id);
    requireAction(sr, "cancel");
    tl(sr, "cancelled", "Ticket dibatalkan", "tenant", reason);
    setStatus(sr, "cancelled");
    persist();
    return sr;
  },
  async sendFeedback(id, rating, comment) {
    await wait(LATENCY);
    const sr = findSR(id);
    requireAction(sr, "feedback");
    sr.feedback = { rating, comment: comment || null, created_at: new Date().toISOString() };
    sr.allowed_actions = sr.allowed_actions.filter((a) => a !== "feedback");
    persist();
    return sr;
  },
  async messages(id) {
    await wait(150);
    const sr = findSR(id);
    sr.unread_messages = 0;
    persist();
    return state.messages[id] ?? [];
  },
  async sendMessage(id, body, photos = []) {
    await wait(LATENCY);
    const sr = findSR(id);
    requireAction(sr, "message");
    // seperti server: body boleh kosong bila ada lampiran
    if (!body.trim() && photos.length === 0) throw problem(400, "VALIDATION_ERROR", "body atau attachment_ids wajib", [{ field: "body", message: "wajib" }]);
    const attachments = photos.map((b) => ({ id: uuid(), content_type: b.type || "image/jpeg", file_name: null, url: blobUrl(b) }));
    const m: Message = { id: uuid(), author_kind: "tenant", author_name: requireUser().full_name, body: body.trim(), attachment_ids: attachments.map((a) => a.id), attachments, created_at: new Date().toISOString(), read_at: null };
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
    await wait(150);
    requireUser();
    return FACILITIES;
  },
  async facilityAvailability(id, date) {
    await wait(200);
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
    await wait(LATENCY);
    requireUser();
    let rows = [...state.bookings].sort((a, b) => b.starts_at.localeCompare(a.starts_at));
    if (params?.upcoming) rows = rows.filter((b) => new Date(b.ends_at) > new Date() && ["pending", "confirmed", "checked_in"].includes(b.status));
    return rows;
  },
  async booking(id) {
    await wait(150);
    const b = state.bookings.find((x) => x.id === id);
    if (!b) throw problem(404, "NOT_FOUND", "Booking tidak ditemukan");
    return b;
  },
  async createBooking(input) {
    await wait(LATENCY);
    requireUser();
    const f = FACILITIES.find((x) => x.id === input.facility_id);
    if (!f) throw problem(404, "NOT_FOUND", "Fasilitas tidak ditemukan");
    const s = new Date(input.starts_at);
    const e = new Date(input.ends_at);
    if (state.bookings.some((b) => b.facility_id === f.id && !["cancelled", "rejected"].includes(b.status) && new Date(b.starts_at) < e && new Date(b.ends_at) > s)) throw problem(409, "SLOT_UNAVAILABLE", "Slot sudah dipesan.");
    const b: Booking = { id: "bk-" + uuid().slice(0, 8), booking_number: nextNumber("BKG"), facility_id: f.id, facility_name: f.name, facility_type: f.facility_type, starts_at: input.starts_at, ends_at: input.ends_at, attendees: input.attendees ?? null, purpose: input.purpose ?? null, notes: input.notes ?? null, status: f.effective_approval ? "pending" : "confirmed", rejection_reason: null, cancel_reason: null, created_at: new Date().toISOString(), allowed_actions: ["cancel"] };
    state.bookings.unshift(b);
    notify({ type: f.effective_approval ? "booking_pending" : "booking_confirmed", title: f.effective_approval ? "Booking Pending" : "Booking Confirmed", body: `${f.name} ${s.toLocaleString("id-ID")}`, object_type: "booking", object_id: b.id, deep_link: `/facilities/bookings/${b.id}`, severity: "info" });
    persist();
    return b;
  },
  async cancelBooking(id, reason) {
    await wait(LATENCY);
    const b = await this.booking(id);
    requireAction(b, "cancel");
    b.status = "cancelled";
    b.cancel_reason = reason;
    b.allowed_actions = [];
    persist();
    return b;
  },

  async visitors(params) {
    await wait(LATENCY);
    requireUser();
    let rows = [...state.visitors].sort((a, b) => b.expected_at.localeCompare(a.expected_at));
    if (params?.upcoming) rows = rows.filter((v) => ["pending_approval", "registered", "checked_in"].includes(v.status));
    return rows;
  },
  async visitor(id) {
    await wait(150);
    const v = state.visitors.find((x) => x.id === id);
    if (!v) throw problem(404, "NOT_FOUND", "Tamu tidak ditemukan");
    return v;
  },
  async createVisitor(input) {
    await wait(LATENCY);
    const u = requireUser();
    if (!input.visitor_name.trim()) throw problem(400, "VALIDATION_ERROR", "Nama tamu wajib", [{ field: "visitor_name", message: "wajib" }]);
    const code = "VP-" + uuid().slice(0, 5).toUpperCase();
    const num = nextNumber("VIS");
    const approval = u.features.visitor_approval_required;
    const host = u.units.find((x) => x.id === input.host_unit_location_id) ?? u.primary_unit;
    const v: Visitor = { id: "vis-" + uuid().slice(0, 8), visitor_number: num, host_unit_label: host?.name ?? null, visitor_name: input.visitor_name, visitor_phone: input.visitor_phone ?? null, visitor_company: input.visitor_company ?? null, purpose: input.purpose ?? null, vehicle_plate: input.vehicle_plate ?? null, headcount: input.headcount ?? 1, expected_at: input.expected_at, expected_until: input.expected_until ?? null, status: approval ? "pending_approval" : "registered", denied_reason: null, checked_in_at: null, checked_out_at: null, created_at: new Date().toISOString(), pass: approval ? null : { id: uuid(), pass_code: code, qr_payload: `BV|${num}|${code}`, valid_from: new Date(new Date(input.expected_at).getTime() - 3_600_000).toISOString(), valid_until: input.expected_until ?? new Date(new Date(input.expected_at).getTime() + 12 * 3_600_000).toISOString(), status: "active", used_at: null }, allowed_actions: ["cancel"] };
    state.visitors.unshift(v);
    persist();
    return v;
  },
  async cancelVisitor(id, _reason) {
    await wait(LATENCY);
    const v = await this.visitor(id);
    requireAction(v, "cancel");
    v.status = "cancelled";
    v.allowed_actions = [];
    if (v.pass) v.pass.status = "revoked";
    persist();
    return v;
  },

  async packages(params) {
    await wait(LATENCY);
    requireUser();
    let rows = [...state.packages].sort((a, b) => b.received_at.localeCompare(a.received_at));
    if (params?.waiting === true) rows = rows.filter((p) => ["received", "notified"].includes(p.status));
    else if (params?.waiting === false) rows = rows.filter((p) => ["picked_up", "returned"].includes(p.status));
    return { data: rows, next_cursor: null };
  },
  async package(id) {
    await wait(150);
    requireUser();
    const p = state.packages.find((x) => x.id === id);
    if (!p) throw problem(404, "NOT_FOUND", "Paket tidak ditemukan");
    return p;
  },

  async vehicles() {
    await wait(LATENCY);
    requireUser();
    return state.vehicles.filter((v) => v.status !== "inactive");
  },
  async vehicle(id) {
    await wait(150);
    requireUser();
    const v = findVehicle(id);
    return v.is_mine ? { ...v, documents: state.vehicleDocs[id] ?? [] } : v;
  },
  async createVehicle(input, document) {
    await wait(LATENCY);
    const u = requireUser();
    const plate = (input.plate_number ?? "").toUpperCase().replace(/\s+/g, " ").trim();
    if (!plate) throw problem(400, "VALIDATION_ERROR", "plate_number wajib", [{ field: "plate_number", message: "wajib" }]);
    if (state.vehicles.some((v) => v.status !== "inactive" && v.plate_number.replace(/\s/g, "") === plate.replace(/\s/g, ""))) throw problem(409, "VEHICLE_EXISTS", "Plat nomor ini sudah terdaftar di gedung; hubungi pengelola bila ini kendaraan Anda", [{ field: "plate_number", message: "sudah terdaftar" }]);
    const unit = u.units.find((x) => x.id === input.unit_id) ?? u.primary_unit;
    const v: Vehicle = { id: "veh-" + uuid().slice(0, 8), plate_number: plate, vehicle_type: input.vehicle_type ?? "car", brand: input.brand?.trim() || null, color: input.color?.trim() || null, unit_location_id: unit?.id ?? null, unit_name: unit?.name ?? null, status: "active", permit_until: null, permit_valid: false, is_mine: true, permits: [], document_count: 0 };
    state.vehicles.push(v);
    if (document) addVehicleDoc(v, document);
    persist();
    return v;
  },
  async updateVehicle(id, input) {
    await wait(LATENCY);
    const u = requireUser();
    const v = findVehicle(id);
    if (input.vehicle_type) v.vehicle_type = input.vehicle_type;
    if (input.brand !== undefined) v.brand = input.brand.trim() || null;
    if (input.color !== undefined) v.color = input.color.trim() || null;
    if (input.unit_id) {
      const unit = u.units.find((x) => x.id === input.unit_id);
      if (!unit) throw problem(400, "VALIDATION_ERROR", "unit_id bukan unit Anda");
      v.unit_location_id = unit.id;
      v.unit_name = unit.name;
    }
    persist();
    return v;
  },
  async removeVehicle(id) {
    await wait(LATENCY);
    requireUser();
    const v = findVehicle(id);
    if (v.permits.some((p) => p.status === "approved" && p.is_active)) throw problem(409, "PERMIT_ACTIVE", "Kendaraan masih memiliki izin parkir aktif; hubungi pengelola untuk mencabutnya");
    for (const p of v.permits) if (p.status === "requested") p.status = "cancelled";
    v.status = "inactive";
    persist();
  },
  async uploadVehicleDocument(id, file) {
    await wait(LATENCY);
    requireUser();
    const v = findVehicle(id);
    addVehicleDoc(v, file);
    persist();
  },
  async parkingAreas() {
    await wait(120);
    requireUser();
    return PARKING_AREAS;
  },
  async parkingPermits(params) {
    await wait(150);
    requireUser();
    const statuses = params?.status ?? [];
    return state.vehicles
      .filter((v) => v.status !== "inactive")
      .flatMap((v) => v.permits)
      .filter((p) => statuses.length === 0 || statuses.includes(p.status))
      .sort((a, b) => b.requested_at.localeCompare(a.requested_at));
  },
  async requestPermit(input) {
    await wait(LATENCY);
    const u = requireUser();
    const v = findVehicle(input.vehicle_id);
    if (v.permits.some((p) => p.status === "requested" || (p.status === "approved" && p.is_active))) throw problem(409, "PERMIT_EXISTS", "Kendaraan ini sudah memiliki izin aktif atau permohonan yang sedang diproses");
    const area = PARKING_AREAS.find((a) => a.id === input.parking_area_id) ?? null;
    const p: ParkingPermit = { id: "pmt-" + uuid().slice(0, 8), permit_number: nextNumber("PRK"), vehicle_id: v.id, plate_number: v.plate_number, vehicle_type: v.vehicle_type, vehicle_label: [v.brand, v.color].filter(Boolean).join(" "), unit_location_id: v.unit_location_id, unit_name: v.unit_name, requested_by_name: u.full_name, parking_area_id: area?.id ?? null, parking_area_name: area?.name ?? null, permit_type: input.permit_type, status: "requested", is_active: false, valid_from: input.valid_from || null, valid_until: null, sticker_number: null, fee_amount: null, notes: input.notes?.trim() || null, decision_reason: null, decided_at: null, requested_at: new Date().toISOString(), allowed_actions: ["view", "cancel"] };
    v.permits.unshift(p);
    persist();
    return p;
  },
  async permit(id) {
    await wait(150);
    requireUser();
    return findPermit(id);
  },
  async cancelPermit(id) {
    await wait(LATENCY);
    const p = findPermit(id);
    if (p.status !== "requested") throw problem(409, "INVALID_TRANSITION", "Hanya permohonan yang belum diproses yang dapat dibatalkan");
    p.status = "cancelled";
    p.allowed_actions = ["view"];
    persist();
    return p;
  },

  async feedbackList() {
    await wait(LATENCY);
    requireUser();
    return { data: [...state.feedback].sort((a, b) => b.created_at.localeCompare(a.created_at)), next_cursor: null };
  },
  async feedback(id) {
    await wait(150);
    requireUser();
    const f = state.feedback.find((x) => x.id === id);
    if (!f) throw problem(404, "NOT_FOUND", "Feedback tidak ditemukan");
    return f;
  },
  async createFeedback(input, photos = []) {
    await wait(LATENCY);
    requireUser();
    if (!input.body.trim()) throw problem(400, "VALIDATION_ERROR", "body wajib", [{ field: "body", message: "wajib" }]);
    const f: TenantFeedback = { id: "fb-" + uuid().slice(0, 8), feedback_number: nextNumber("FDB"), category: input.category, subject: input.subject?.trim() || null, body: input.body.trim(), is_anonymous: input.is_anonymous, status: "new", response: null, responded_at: null, created_at: new Date().toISOString(), photos: photos.map((b) => ({ id: uuid(), url: blobUrl(b) })) };
    state.feedback.unshift(f);
    persist();
    return f;
  },

  async billSummary() {
    await wait(200);
    requireUser();
    const open = state.invoices.filter((i) => ["issued", "partially_paid", "overdue"].includes(i.status));
    const next = open.map((i) => i.due_at).sort()[0] ?? null;
    return { outstanding_amount: open.reduce((a, i) => a + i.outstanding_amount, 0), unpaid_count: open.length, overdue_count: open.filter((i) => i.status === "overdue").length, next_due_at: next, currency_code: "IDR" };
  },
  async bills(params) {
    await wait(LATENCY);
    requireUser();
    let rows = [...state.invoices].sort((a, b) => b.due_at.localeCompare(a.due_at));
    if (params?.open) rows = rows.filter((i) => ["issued", "partially_paid", "overdue"].includes(i.status));
    return rows.map((i) => ({ ...i, allowed_actions: Array.from(new Set(["view", "download_pdf", ...i.allowed_actions])) }));
  },
  async bill(id) {
    await wait(150);
    const b = state.invoices.find((x) => x.id === id);
    if (!b) throw problem(404, "NOT_FOUND", "Tagihan tidak ditemukan");
    return { ...b, allowed_actions: Array.from(new Set(["view", "download_pdf", ...b.allowed_actions])) };
  },
  async paymentProviders() {
    await wait(120);
    return [
      { code: "manual", name: "Transfer Bank (verifikasi manual)", is_active: true, methods: ["transfer"], config: { instructions: "Transfer ke BCA 123-456-7890 a.n. PT Graha Pangeran Property, lalu unggah bukti transfer." } },
      { code: "mock_gateway", name: "Payment Gateway (demo)", is_active: true, methods: ["va", "qris"], config: {} },
    ];
  },
  async payBill(id, providerCode, method) {
    await wait(LATENCY);
    const inv = state.invoices.find((x) => x.id === id);
    if (!inv) throw problem(404, "NOT_FOUND", "Tagihan tidak ditemukan");
    if (inv.outstanding_amount <= 0) throw problem(409, "INVOICE_NOT_PAYABLE", "Tagihan sudah lunas.");
    if (state.payments.some((p) => p.invoice_id === id && ["initiated", "pending"].includes(p.status))) throw problem(409, "PAYMENT_PENDING", "Masih ada pembayaran yang menunggu.");
    const p: Payment = { id: "pay-" + uuid().slice(0, 8), payment_number: nextNumber("PAY"), invoice_id: id, invoice_number: inv.invoice_number, amount: inv.outstanding_amount, currency_code: "IDR", provider_code: providerCode, method, status: providerCode === "manual" ? "pending" : "initiated", checkout_url: null, va_number: method === "va" ? "8808" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0") : null, qr_string: method === "qris" ? "00020101021226..." : null, instructions: providerCode === "manual" ? "Transfer ke BCA 123-456-7890 a.n. PT Graha Pangeran Property, lalu unggah bukti transfer di sini." : null, expires_at: new Date(Date.now() + 24 * 3_600_000).toISOString(), paid_at: null, receipt_number: null, failure_reason: null, created_at: new Date().toISOString() };
    state.payments.unshift(p);
    inv.payment_count++;
    persist();
    return paymentActions(p);
  },
  async payments(invoiceId) {
    await wait(150);
    requireUser();
    return (invoiceId ? state.payments.filter((p) => p.invoice_id === invoiceId) : state.payments).map(paymentActions);
  },
  async payment(id) {
    await wait(150);
    const p = state.payments.find((x) => x.id === id);
    if (!p) throw problem(404, "NOT_FOUND", "Pembayaran tidak ditemukan");
    return paymentActions(p);
  },
  async paymentProofs(paymentId) {
    await wait(150);
    requireUser();
    return state.proofs[paymentId] ?? [];
  },
  async uploadPaymentProof(paymentId, file, fileName) {
    await wait(LATENCY);
    const p = await this.payment(paymentId);
    if (!p.allowed_actions?.includes("upload_proof")) throw problem(409, "PAYMENT_NOT_PENDING", "Bukti hanya dapat diunggah untuk pembayaran yang menunggu verifikasi");
    state.proofs[paymentId] = [...(state.proofs[paymentId] ?? []), { id: uuid(), content_type: file.type || "image/jpeg", file_name: fileName ?? null, url: blobUrl(file), uploaded_at: new Date().toISOString() }];
    persist();
  },
  async invoiceDocumentLink(invoiceId) {
    await wait(150);
    const inv = await this.bill(invoiceId);
    return mockPdfLink(inv.invoice_number);
  },
  async receiptDocumentLink(paymentId) {
    await wait(150);
    const p = await this.payment(paymentId);
    // seperti server: kwitansi hanya untuk pembayaran paid/refunded
    if (!["paid", "refunded"].includes(p.status)) throw problem(409, "RECEIPT_NOT_AVAILABLE", "Kwitansi hanya tersedia untuk pembayaran yang sudah diverifikasi");
    return mockPdfLink(p.receipt_number ?? p.payment_number);
  },
  async statement(params) {
    await wait(LATENCY);
    const u = requireUser();
    const to = params?.to || ymdToday();
    const fromD = new Date();
    fromD.setMonth(fromD.getMonth() - 6);
    const from = params?.from || `${fromD.getFullYear()}-${String(fromD.getMonth() + 1).padStart(2, "0")}-${String(fromD.getDate()).padStart(2, "0")}`;
    if (to < from) throw problem(400, "VALIDATION_ERROR", "to harus setelah from", [{ field: "to", message: "sebelum from" }]);
    const raw: Omit<StatementEntry, "balance">[] = [
      ...state.invoices.filter((i) => i.issued_at).map((i) => ({ date: i.issued_at!, kind: "invoice", reference: i.invoice_number, description: i.description ?? i.invoice_type, debit: i.total_amount, credit: 0, object_type: "invoice", object_id: i.id })),
      ...state.payments.filter((p) => p.status === "paid" && p.paid_at).map((p) => ({ date: p.paid_at!, kind: "payment", reference: p.receipt_number ?? p.payment_number, description: `Pembayaran ${p.invoice_number} (${p.method})`, debit: 0, credit: p.amount, object_type: "payment", object_id: p.id })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    const day = (d: string) => d.slice(0, 10);
    const opening = raw.filter((e) => day(e.date) < from).reduce((a, e) => a + e.debit - e.credit, 0);
    let bal = opening;
    const entries: StatementEntry[] = raw.filter((e) => day(e.date) >= from && day(e.date) <= to).map((e) => ({ ...e, balance: (bal += e.debit - e.credit) }));
    const st: Statement = {
      property_id: u.property.id,
      property_name: u.property.name,
      tenant_id: u.tenant?.id ?? null,
      tenant_name: u.tenant?.name ?? null,
      unit_location_id: null,
      unit_label: null,
      from,
      to,
      opening_balance: opening,
      total_debit: entries.reduce((a, e) => a + e.debit, 0),
      total_credit: entries.reduce((a, e) => a + e.credit, 0),
      closing_balance: bal,
      outstanding_amount: state.invoices.filter((i) => ["issued", "partially_paid", "overdue"].includes(i.status)).reduce((a, i) => a + i.outstanding_amount, 0),
      credit_balance: 0,
      deposit_balance: 2_000_000,
      entries,
      currency_code: "IDR",
      generated_at: new Date().toISOString(),
    };
    return st;
  },
  async statementLink(params) {
    const st = await this.statement(params);
    return mockPdfLink(`Statement ${st.from} sd ${st.to}`);
  },
  async balances() {
    await wait(150);
    requireUser();
    return { deposit_balance: 2_000_000, credit_balance: 0, outstanding_amount: state.invoices.filter((i) => ["issued", "partially_paid", "overdue"].includes(i.status)).reduce((a, i) => a + i.outstanding_amount, 0), currency_code: "IDR" };
  },

  async notifications() {
    await wait(200);
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
  async announcements(params) {
    await wait(150);
    requireUser();
    const rows = params?.category ? state.announcements.filter((a) => (a.category ?? "announcement") === params.category) : state.announcements;
    return { data: rows, next_cursor: null };
  },
  async announcement(id) {
    await wait(120);
    const a = state.announcements.find((x) => x.id === id);
    if (!a) throw problem(404, "NOT_FOUND", "Pengumuman tidak ditemukan");
    if (!a.read_at) {
      a.read_at = new Date().toISOString(); // membuka = tercatat dibaca (P3-ANN-05)
      persist();
    }
    return a;
  },
  async acknowledgeAnnouncement(id) {
    await wait(LATENCY);
    const a = state.announcements.find((x) => x.id === id);
    if (!a) throw problem(404, "NOT_FOUND", "Pengumuman tidak ditemukan");
    const now = new Date().toISOString();
    a.read_at = a.read_at ?? now;
    a.acknowledged_at = a.acknowledged_at ?? now;
    persist();
    return a;
  },

  async notificationPreferences() {
    await wait(150);
    requireUser();
    return state.prefs;
  },
  async setNotificationPreference(pref) {
    await wait(150);
    requireUser();
    // seperti server: kanal yang tidak dikirim mempertahankan nilai lama
    state.prefs = state.prefs.map((p) => (p.type === pref.type ? { ...p, inapp: pref.inapp ?? p.inapp, push: pref.push ?? p.push, email: pref.email ?? p.email } : p));
    persist();
  },
  async pushConfig() {
    await wait(100);
    requireUser(true);
    // Mode demo: server push tidak ada → Web Push dinonaktifkan (kunci VAPID palsu akan gagal subscribe).
    return { web_push: { enabled: false }, fcm: { enabled: false }, devices: state.devices.map((d) => ({ platform: "web", push_kind: "webpush", app: "tenant", last_seen_at: new Date().toISOString(), token_hint: "…" + d.slice(-12) })) };
  },
  async registerDevice(input) {
    await wait(100);
    requireUser();
    const token = input.subscription?.endpoint ?? input.token;
    if (!token) throw problem(400, "VALIDATION_ERROR", "token wajib");
    if (!state.devices.includes(token)) state.devices.push(token);
    persist();
  },
  async unregisterDevice(tokenOrEndpoint) {
    state.devices = state.devices.filter((d) => d !== tokenOrEndpoint);
    persist();
  },
};
