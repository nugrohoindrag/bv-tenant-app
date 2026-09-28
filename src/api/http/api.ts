// Implementasi HTTP TenantApi terhadap backend Go BuildingVision (contracts/openapi/v1.yaml, tag "Tenant App" & "Billing"):
// auth/login|refresh|logout (client tenant_app), me/password, me/devices, /tenant/me, /tenant/registration/*, /tenant/register,
// /tenant/units, /tenant/members, /tenant/categories, /tenant/locations, /tenant/requests[/{id}/(cancel|confirm|reopen|feedback|messages)],
// /tenant/attachments/presign|{id}/confirm, /tenant/facilities, /tenant/bookings, /tenant/visitors, /tenant/packages,
// /tenant/vehicles, /tenant/parking-areas, /tenant/parking-permits, /tenant/feedback, /tenant/invoices(+/pdf, /document-link),
// /tenant/payments(+/receipt, /proofs, /document-link), /tenant/statement(+/link), /tenant/balances, /tenant/payment-providers,
// /tenant/announcements(+/acknowledge), /notifications(+/preferences), /push/config.
// Catatan kontrak: server menolak field JSON yang tidak dikenal (DisallowUnknownFields) — kirim hanya field yang didefinisikan.
import type { TenantApi } from "..";
import type {
  Announcement,
  BillSummary,
  Booking,
  CreateSRInput,
  DocumentLink,
  Facility,
  Invoice,
  LoginResult,
  Member,
  MemberCreated,
  Message,
  Notification,
  NotificationPreference,
  Option,
  Package,
  Page,
  ParkingArea,
  ParkingPermit,
  Payment,
  PaymentProof,
  PaymentProvider,
  PushConfig,
  RegisterResult,
  ReportableLocation,
  SRCategory,
  ServiceRequest,
  Slot,
  Statement,
  TenantBalances,
  TenantFeedback,
  TenantUser,
  UnitSummary,
  Vehicle,
  Visitor,
} from "../types";
import { http, tokenStore, type ListResponse } from "@/lib/http";
import { uuid } from "@/lib/utils";

export const ORG_SLUG = import.meta.env.VITE_ORG_SLUG || "";

interface TokenPair {
  access_token: string;
  refresh_token?: string;
  access_expires_at: string;
  refresh_expires_at: string;
  token_type: string;
  must_change_password?: boolean;
}

interface PresignOutput {
  attachment_id: string;
  upload_url: string;
  storage_key: string;
  expires_at: string;
  method: string;
  headers?: Record<string, string>;
}

/** Object yang boleh diberi lampiran oleh akun tenant (tenantUploadPolicy server). */
export type TenantUploadObject = "service_request" | "tenant_feedback" | "payment" | "vehicle";

const EXT: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf" };

/** attachment_type sesuai isi file: gambar → photo, selain itu (PDF) → document. */
export function attachmentTypeFor(contentType: string): "photo" | "document" {
  return contentType.startsWith("image/") ? "photo" : "document";
}

/** Presign → PUT ke storage → confirm. Mengembalikan attachment_id (dipakai sebagai attachment_ids pesan). */
export async function uploadAttachment(objectType: TenantUploadObject, objectId: string, blob: Blob, fileName?: string): Promise<string> {
  const contentType = blob.type || "image/jpeg";
  const pre = await http<PresignOutput>("tenant/attachments/presign", {
    body: {
      object_type: objectType,
      object_id: objectId,
      attachment_type: attachmentTypeFor(contentType),
      content_type: contentType,
      size_bytes: blob.size,
      client_attachment_id: uuid(),
      original_filename: fileName || `tenant-${Date.now()}${EXT[contentType] ?? ""}`,
    },
  });
  const res = await fetch(pre.upload_url, { method: pre.method || "PUT", headers: { "Content-Type": contentType, ...pre.headers }, body: blob });
  if (!res.ok) throw new Error("Unggah file gagal (" + res.status + ")");
  await http(`tenant/attachments/${pre.attachment_id}/confirm`, { body: { captured_at: new Date().toISOString() } });
  return pre.attachment_id;
}

const list = async <T,>(path: string, query?: Record<string, string | number | boolean | undefined | null>) => (await http<ListResponse<T>>(path, { query })).data;

export const httpApi: TenantApi = {
  mode: "http",

  async login(email, password): Promise<LoginResult> {
    const pair = await http<TokenPair>("auth/login", { body: { identifier: email, password, client: "tenant_app" }, auth: false });
    tokenStore.set({ access_token: pair.access_token, refresh_token: pair.refresh_token });
    const user = await http<TenantUser>("tenant/me");
    const must = !!(pair.must_change_password || user.must_change_password);
    return { user: { ...user, must_change_password: must }, access_token: pair.access_token, refresh_token: pair.refresh_token, must_change_password: must };
  },

  async register(input) {
    return http<RegisterResult>("tenant/register", {
      auth: false,
      idempotencyKey: uuid(),
      body: { organization_slug: ORG_SLUG, full_name: `${input.first_name} ${input.last_name}`.trim(), first_name: input.first_name, last_name: input.last_name, gender: input.gender, phone: input.phone, email: input.email, password: input.password, property_id: input.property_id, unit_id: input.unit_id, ownership_status: input.ownership_status },
    });
  },

  async me() {
    return http<TenantUser>("tenant/me");
  },
  async updateMe(input) {
    // phone "" = kosongkan nomor (server → null)
    const body: { full_name?: string; phone?: string } = {};
    if (input.full_name !== undefined) body.full_name = input.full_name;
    if (input.phone !== undefined) body.phone = input.phone.trim();
    return http<TenantUser>("tenant/me", { method: "PATCH", body });
  },

  async logout() {
    try {
      await http("auth/logout", { method: "POST", body: { client: "tenant_app", refresh_token: tokenStore.get()?.refresh_token } });
    } finally {
      tokenStore.set(null);
    }
  },

  async changePassword(current, next) {
    // Route backend: POST /me/password (204). Sebelumnya PUT → 405.
    await http("me/password", { method: "POST", body: { current_password: current, new_password: next } });
  },

  async properties() {
    return list<Option>("tenant/registration/properties", { organization_slug: ORG_SLUG });
  },
  async floors(propertyId) {
    return list<Option>("tenant/registration/locations", { organization_slug: ORG_SLUG, property_id: propertyId, type: "floor" });
  },
  async units(propertyId, floorId) {
    return list<Option>("tenant/registration/locations", { organization_slug: ORG_SLUG, property_id: propertyId, parent_id: floorId, type: "unit" });
  },

  async myUnits() {
    return list<UnitSummary>("tenant/units");
  },
  async myUnit(id) {
    return http<UnitSummary>(`tenant/units/${id}`);
  },

  async members() {
    return list<Member>("tenant/members");
  },
  async createMember(input) {
    const body: { full_name: string; email: string; phone?: string; unit_ids?: string[] } = { full_name: input.full_name, email: input.email };
    if (input.phone) body.phone = input.phone;
    if (input.unit_ids?.length) body.unit_ids = input.unit_ids;
    return http<MemberCreated>("tenant/members", { body });
  },
  async deactivateMember(id) {
    return http<Member>(`tenant/members/${id}/deactivate`, { method: "POST" });
  },
  async reactivateMember(id) {
    return http<Member>(`tenant/members/${id}/reactivate`, { method: "POST" });
  },
  async setMemberUnits(id, unitIds) {
    return http<Member>(`tenant/members/${id}/units`, { method: "PUT", body: { unit_ids: unitIds } });
  },

  async categories() {
    return list<SRCategory>("tenant/categories");
  },
  async locations() {
    return list<ReportableLocation>("tenant/locations");
  },

  async createServiceRequest(input: CreateSRInput) {
    const sr = await http<ServiceRequest>("tenant/requests", {
      idempotencyKey: input.idempotency_key,
      body: {
        category_code: input.category_code,
        request_type: input.request_type || null,
        title: input.title,
        description: input.description,
        location_id: input.location_id,
        contact_preference: input.contact_preference ?? null,
        preferred_visit_at: input.preferred_visit_at ?? null,
        additional_note: input.additional_note ?? null,
      },
    });
    for (const p of input.photos) await uploadAttachment("service_request", sr.id, p);
    return input.photos.length ? http<ServiceRequest>(`tenant/requests/${sr.id}`) : sr;
  },

  async serviceRequests(params): Promise<Page<ServiceRequest>> {
    return http<Page<ServiceRequest>>("tenant/requests", { query: { status: params?.status, open: params?.open ? "true" : undefined, cursor: params?.cursor ?? undefined, q: params?.q, limit: 50 } });
  },
  async serviceRequest(id) {
    return http<ServiceRequest>(`tenant/requests/${id}`);
  },
  async confirmRequest(id) {
    return http<ServiceRequest>(`tenant/requests/${id}/confirm`, { method: "POST", body: {}, idempotencyKey: uuid() });
  },
  async reopenRequest(id, reason, photos) {
    const sr = await http<ServiceRequest>(`tenant/requests/${id}/reopen`, { body: { reason }, idempotencyKey: uuid() });
    for (const p of photos) await uploadAttachment("service_request", sr.id, p);
    return photos.length ? http<ServiceRequest>(`tenant/requests/${id}`) : sr;
  },
  async cancelRequest(id, reason) {
    return http<ServiceRequest>(`tenant/requests/${id}/cancel`, { body: { reason }, idempotencyKey: uuid() });
  },
  async sendFeedback(id, rating, comment) {
    return http<ServiceRequest>(`tenant/requests/${id}/feedback`, { body: { rating, comment: comment || null }, idempotencyKey: uuid() });
  },
  async messages(id) {
    return list<Message>(`tenant/requests/${id}/messages`);
  },
  async sendMessage(id, body, photos = []) {
    const attachmentIds: string[] = [];
    for (const p of photos) attachmentIds.push(await uploadAttachment("service_request", id, p));
    return http<Message>(`tenant/requests/${id}/messages`, { body: { body, attachment_ids: attachmentIds }, idempotencyKey: uuid() });
  },

  async facilities() {
    return list<Facility>("tenant/facilities");
  },
  async facilityAvailability(id, date) {
    return list<Slot>(`tenant/facilities/${id}/availability`, { date });
  },
  async bookings(params) {
    return list<Booking>("tenant/bookings", { upcoming: params?.upcoming ? "true" : undefined, limit: 50 });
  },
  async booking(id) {
    return http<Booking>(`tenant/bookings/${id}`);
  },
  async createBooking(input) {
    return http<Booking>("tenant/bookings", { body: input, idempotencyKey: uuid() });
  },
  async cancelBooking(id, reason) {
    return http<Booking>(`tenant/bookings/${id}/cancel`, { body: { reason }, idempotencyKey: uuid() });
  },

  async visitors(params) {
    return list<Visitor>("tenant/visitors", { upcoming: params?.upcoming ? "true" : undefined, limit: 50 });
  },
  async visitor(id) {
    return http<Visitor>(`tenant/visitors/${id}`);
  },
  async createVisitor(input) {
    return http<Visitor>("tenant/visitors", { body: input, idempotencyKey: uuid() });
  },
  async cancelVisitor(id, reason) {
    return http<Visitor>(`tenant/visitors/${id}/cancel`, { body: { reason }, idempotencyKey: uuid() });
  },

  async packages(params) {
    const waiting = params?.waiting === undefined ? undefined : params.waiting ? "true" : "false";
    return http<Page<Package>>("tenant/packages", { query: { waiting, cursor: params?.cursor ?? undefined, limit: 50 } });
  },
  async package(id) {
    return http<Package>(`tenant/packages/${id}`);
  },

  async vehicles() {
    return list<Vehicle>("tenant/vehicles");
  },
  async vehicle(id) {
    return http<Vehicle>(`tenant/vehicles/${id}`);
  },
  async createVehicle(input, document) {
    const v = await http<Vehicle>("tenant/vehicles", { body: vehicleBody(input) });
    if (document) {
      await uploadAttachment("vehicle", v.id, document);
      return { ...v, document_count: v.document_count + 1 };
    }
    return v;
  },
  async updateVehicle(id, input) {
    return http<Vehicle>(`tenant/vehicles/${id}`, { method: "PATCH", body: vehicleBody(input) });
  },
  async removeVehicle(id) {
    await http(`tenant/vehicles/${id}`, { method: "DELETE" });
  },
  async uploadVehicleDocument(id, file) {
    await uploadAttachment("vehicle", id, file);
  },
  async parkingAreas() {
    return list<ParkingArea>("tenant/parking-areas");
  },
  async parkingPermits(params) {
    return list<ParkingPermit>("tenant/parking-permits", { status: params?.status?.length ? params.status.join(",") : undefined });
  },
  async requestPermit(input) {
    return http<ParkingPermit>("tenant/parking-permits", {
      body: { vehicle_id: input.vehicle_id, permit_type: input.permit_type, parking_area_id: input.parking_area_id || null, valid_from: input.valid_from || null, notes: input.notes?.trim() || null },
    });
  },
  async permit(id) {
    return http<ParkingPermit>(`tenant/parking-permits/${id}`);
  },
  async cancelPermit(id) {
    return http<ParkingPermit>(`tenant/parking-permits/${id}/cancel`, { method: "POST" });
  },

  async feedbackList(params) {
    return http<Page<TenantFeedback>>("tenant/feedback", { query: { cursor: params?.cursor ?? undefined, limit: 50 } });
  },
  async feedback(id) {
    return http<TenantFeedback>(`tenant/feedback/${id}`);
  },
  async createFeedback(input, photos = []) {
    const fb = await http<TenantFeedback>("tenant/feedback", {
      body: { category: input.category, subject: input.subject?.trim() ?? "", body: input.body, is_anonymous: input.is_anonymous, unit_id: input.unit_id || null },
    });
    for (const p of photos) await uploadAttachment("tenant_feedback", fb.id, p);
    return photos.length ? http<TenantFeedback>(`tenant/feedback/${fb.id}`) : fb;
  },

  async billSummary() {
    return http<BillSummary>("tenant/invoices/summary");
  },
  async bills(params) {
    return list<Invoice>("tenant/invoices", { open: params?.open ? "true" : undefined, limit: 50 });
  },
  async bill(id) {
    return http<Invoice>(`tenant/invoices/${id}`);
  },
  async paymentProviders() {
    return list<PaymentProvider>("tenant/payment-providers");
  },
  async payBill(id, providerCode, method) {
    return http<Payment>(`tenant/invoices/${id}/payments`, { body: { provider_code: providerCode, method }, idempotencyKey: uuid() });
  },
  async payments(invoiceId) {
    // B-14: seluruh pembayaran satu invoice difilter server
    return list<Payment>("tenant/payments", { invoice_id: invoiceId, limit: 100 });
  },
  async payment(id) {
    return http<Payment>(`tenant/payments/${id}`);
  },
  async paymentProofs(paymentId) {
    return list<PaymentProof>(`tenant/payments/${paymentId}/proofs`);
  },
  async uploadPaymentProof(paymentId, file, fileName) {
    await uploadAttachment("payment", paymentId, file, fileName);
  },
  async invoiceDocumentLink(invoiceId) {
    return http<DocumentLink>(`tenant/invoices/${invoiceId}/document-link`, { method: "POST" });
  },
  async receiptDocumentLink(paymentId) {
    return http<DocumentLink>(`tenant/payments/${paymentId}/document-link`, { method: "POST" });
  },
  async statement(params) {
    return http<Statement>("tenant/statement", { query: { from: params?.from, to: params?.to } });
  },
  async statementLink(params) {
    const body: { from?: string; to?: string } = {};
    if (params?.from) body.from = params.from;
    if (params?.to) body.to = params.to;
    return http<DocumentLink>("tenant/statement/link", { method: "POST", body });
  },
  async balances() {
    return http<TenantBalances>("tenant/balances");
  },

  async notifications() {
    return list<Notification>("notifications", { limit: 50 });
  },
  async markRead(id) {
    await http(`notifications/${id}/read`, { method: "POST", body: {} });
  },
  async markAllRead() {
    await http("notifications/read-all", { method: "POST", body: {} });
  },
  async unreadCount() {
    const res = await http<ListResponse<Notification> & { unread_count?: number }>("notifications", { query: { unread: true, limit: 1 } });
    return res.unread_count ?? res.data.length;
  },
  async announcements(params) {
    return http<Page<Announcement>>("tenant/announcements", { query: { cursor: params?.cursor ?? undefined, category: params?.category ?? undefined, limit: 20 } });
  },
  async announcement(id) {
    return http<Announcement>(`tenant/announcements/${id}`);
  },
  async acknowledgeAnnouncement(id) {
    return http<Announcement>(`tenant/announcements/${id}/acknowledge`, { method: "POST" });
  },

  async notificationPreferences() {
    return list<NotificationPreference>("notifications/preferences");
  },
  async setNotificationPreference(pref) {
    // Server menggabungkan dengan nilai lama: kanal yang tidak dikirim tetap → kirim hanya kanal yang diubah.
    const body: { type: string; inapp?: boolean; push?: boolean; email?: boolean } = { type: pref.type };
    if (pref.inapp !== undefined) body.inapp = pref.inapp;
    if (pref.push !== undefined) body.push = pref.push;
    if (pref.email !== undefined) body.email = pref.email;
    await http("notifications/preferences", { method: "PUT", body });
  },
  async pushConfig() {
    return http<PushConfig>("push/config");
  },
  async registerDevice(input) {
    const body: Record<string, unknown> = { platform: input.platform };
    if (input.subscription) body.subscription = { endpoint: input.subscription.endpoint, keys: { p256dh: input.subscription.keys.p256dh, auth: input.subscription.keys.auth } };
    if (input.token) body.token = input.token;
    if (input.device_id) body.device_id = input.device_id;
    if (input.app_version) body.app_version = input.app_version;
    await http("me/devices", { body });
  },
  async unregisterDevice(tokenOrEndpoint) {
    // Route DELETE /me/devices/{token}; endpoint Web Push (mengandung '/') & token FCM (':') dikirim lewat ?endpoint=
    await http("me/devices/device", { method: "DELETE", query: { endpoint: tokenOrEndpoint } });
  },
};

function vehicleBody(input: { plate_number?: string; vehicle_type?: string; brand?: string; color?: string; unit_id?: string | null }) {
  const body: Record<string, string> = {};
  if (input.plate_number !== undefined) body.plate_number = input.plate_number.trim();
  if (input.vehicle_type) body.vehicle_type = input.vehicle_type;
  if (input.brand !== undefined) body.brand = input.brand.trim();
  if (input.color !== undefined) body.color = input.color.trim();
  if (input.unit_id) body.unit_id = input.unit_id;
  return body;
}
