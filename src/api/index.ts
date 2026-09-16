// Adapter API Tenant App. Satu antarmuka, dua implementasi:
//  - http: backend Go BuildingVision (`/api/v1/tenant/*`, `/api/v1/auth/*`, `/api/v1/notifications`) — mode utama
//  - mock: data lokal (localStorage) untuk demo/uji layout tanpa backend (VITE_API_MODE=mock)
// Business logic (status, allowed_actions, ketersediaan, tagihan) selalu dari server; UI hanya presentasi.
import type {
  Announcement,
  BillSummary,
  Booking,
  CreateBookingInput,
  CreateSRInput,
  CreateVisitorInput,
  Facility,
  Invoice,
  LoginResult,
  Message,
  Notification,
  Option,
  Page,
  Payment,
  PaymentProvider,
  RegisterInput,
  RegisterResult,
  ReportableLocation,
  SRCategory,
  ServiceRequest,
  Slot,
  TenantUser,
  Visitor,
} from "./types";

export interface TenantApi {
  readonly mode: "mock" | "http";
  // auth & akun (TD-P1-003: akun tenant = users + tenant_users, client `tenant_app`)
  login(email: string, password: string): Promise<LoginResult>;
  register(input: RegisterInput): Promise<RegisterResult>;
  me(): Promise<TenantUser>;
  updateMe(input: { full_name?: string; phone?: string }): Promise<TenantUser>;
  logout(): Promise<void>;
  changePassword(current: string, next: string): Promise<void>;
  // master registrasi (publik, rate-limited)
  properties(): Promise<Option[]>;
  floors(propertyId: string): Promise<Option[]>;
  units(propertyId: string, floorId: string): Promise<Option[]>;
  // Report an Issue / Ticket (PRD §10–§17)
  categories(): Promise<SRCategory[]>;
  locations(): Promise<ReportableLocation[]>;
  createServiceRequest(input: CreateSRInput): Promise<ServiceRequest>;
  serviceRequests(params?: { status?: string; open?: boolean; cursor?: string | null; q?: string }): Promise<Page<ServiceRequest>>;
  serviceRequest(id: string): Promise<ServiceRequest>;
  confirmRequest(id: string): Promise<ServiceRequest>;
  reopenRequest(id: string, reason: string, photos: Blob[]): Promise<ServiceRequest>;
  cancelRequest(id: string, reason: string): Promise<ServiceRequest>;
  sendFeedback(id: string, rating: number, comment: string): Promise<ServiceRequest>;
  messages(id: string): Promise<Message[]>;
  sendMessage(id: string, body: string): Promise<Message>;
  // Facilities (PRD §3.6)
  facilities(): Promise<Facility[]>;
  facilityAvailability(id: string, date: string): Promise<Slot[]>;
  bookings(params?: { upcoming?: boolean }): Promise<Booking[]>;
  booking(id: string): Promise<Booking>;
  createBooking(input: CreateBookingInput): Promise<Booking>;
  cancelBooking(id: string, reason: string): Promise<Booking>;
  // Visitors (PRD §3.7)
  visitors(params?: { upcoming?: boolean }): Promise<Visitor[]>;
  visitor(id: string): Promise<Visitor>;
  createVisitor(input: CreateVisitorInput): Promise<Visitor>;
  cancelVisitor(id: string, reason: string): Promise<Visitor>;
  // Bills & payment (PRD §23; status via verified callback)
  billSummary(): Promise<BillSummary>;
  bills(params?: { open?: boolean }): Promise<Invoice[]>;
  bill(id: string): Promise<Invoice>;
  paymentProviders(): Promise<PaymentProvider[]>;
  payBill(id: string, providerCode: string, method: string): Promise<Payment>;
  payments(invoiceId?: string): Promise<Payment[]>;
  payment(id: string): Promise<Payment>;
  // Inbox (PRD §20)
  notifications(): Promise<Notification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
  unreadCount(): Promise<number>;
  announcements(params?: { cursor?: string | null }): Promise<Page<Announcement>>;
  announcement(id: string): Promise<Announcement>;
}

import { mockApi } from "./mock/api";
import { httpApi } from "./http/api";

export const API_MODE: "mock" | "http" = import.meta.env.VITE_API_MODE === "mock" ? "mock" : "http";

let current: TenantApi = API_MODE === "http" ? httpApi : mockApi;

export function api(): TenantApi {
  return current;
}

/** Untuk test: paksa implementasi tertentu. */
export function setApi(impl: TenantApi) {
  current = impl;
}
