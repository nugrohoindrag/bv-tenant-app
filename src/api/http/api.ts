// Implementasi HTTP TenantApi terhadap backend Go BuildingVision P1 (contracts/openapi/v1.yaml):
// auth/login|refresh|logout (client tenant_app), me/password, /tenant/me, /tenant/registration/*, /tenant/register,
// /tenant/categories, /tenant/locations, /tenant/requests[/{id}/(cancel|confirm|reopen|feedback|messages)],
// /tenant/attachments/presign|{id}/confirm, /tenant/facilities, /tenant/bookings, /tenant/visitors, /tenant/invoices,
// /tenant/payments, /tenant/payment-providers, /tenant/announcements, /notifications.
import type { TenantApi } from "..";
import type {
  Announcement,
  BillSummary,
  Booking,
  CreateSRInput,
  Facility,
  Invoice,
  LoginResult,
  Message,
  Notification,
  Option,
  Page,
  Payment,
  PaymentProvider,
  RegisterResult,
  ReportableLocation,
  SRCategory,
  ServiceRequest,
  Slot,
  TenantUser,
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
}

interface PresignOutput {
  attachment_id: string;
  upload_url: string;
  storage_key: string;
  expires_at: string;
  method: string;
  headers?: Record<string, string>;
}

async function uploadPhoto(objectId: string, blob: Blob) {
  const pre = await http<PresignOutput>("tenant/attachments/presign", {
    body: {
      object_type: "service_request",
      object_id: objectId,
      attachment_type: "photo",
      content_type: blob.type || "image/jpeg",
      size_bytes: blob.size,
      client_attachment_id: uuid(),
      original_filename: `tenant-${Date.now()}.jpg`,
    },
  });
  const res = await fetch(pre.upload_url, { method: pre.method || "PUT", headers: { "Content-Type": blob.type || "image/jpeg", ...(pre.headers ?? {}) }, body: blob });
  if (!res.ok) throw new Error("Unggah foto gagal (" + res.status + ")");
  await http(`tenant/attachments/${pre.attachment_id}/confirm`, { body: { captured_at: new Date().toISOString() } });
}

const list = async <T,>(path: string, query?: Record<string, string | number | boolean | undefined | null>) => (await http<ListResponse<T>>(path, { query })).data;

export const httpApi: TenantApi = {
  mode: "http",

  async login(email, password): Promise<LoginResult> {
    const pair = await http<TokenPair>("auth/login", { body: { identifier: email, password, client: "tenant_app" }, auth: false });
    tokenStore.set({ access_token: pair.access_token, refresh_token: pair.refresh_token });
    const user = await http<TenantUser>("tenant/me");
    return { user, access_token: pair.access_token, refresh_token: pair.refresh_token };
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
    return http<TenantUser>("tenant/me", { method: "PATCH", body: input });
  },

  async logout() {
    try {
      await http("auth/logout", { method: "POST", body: { client: "tenant_app", refresh_token: tokenStore.get()?.refresh_token } });
    } finally {
      tokenStore.set(null);
    }
  },

  async changePassword(current, next) {
    await http("me/password", { method: "PUT", body: { current_password: current, new_password: next } });
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
        title: input.title,
        description: input.description,
        location_id: input.location_id,
        contact_preference: input.contact_preference ?? null,
        preferred_visit_at: input.preferred_visit_at ?? null,
        additional_note: input.additional_note ?? null,
      },
    });
    for (const p of input.photos) await uploadPhoto(sr.id, p);
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
    for (const p of photos) await uploadPhoto(sr.id, p);
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
  async sendMessage(id, body) {
    return http<Message>(`tenant/requests/${id}/messages`, { body: { body, attachment_ids: [] }, idempotencyKey: uuid() });
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
    const rows = await list<Payment>("tenant/payments", { limit: 50 });
    return invoiceId ? rows.filter((p) => p.invoice_id === invoiceId) : rows;
  },
  async payment(id) {
    return http<Payment>(`tenant/payments/${id}`);
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
    return http<Page<Announcement>>("tenant/announcements", { query: { cursor: params?.cursor ?? undefined, limit: 20 } });
  },
  async announcement(id) {
    return http<Announcement>(`tenant/announcements/${id}`);
  },
};
