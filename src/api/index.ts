// Adapter API Tenant App. Satu antarmuka, dua implementasi:
//  - http: backend Go BuildingVision (`/api/v1/tenant/*`, `/api/v1/auth/*`, `/api/v1/notifications`) — mode utama
//  - mock: data lokal (localStorage) untuk demo/uji layout tanpa backend (VITE_API_MODE=mock)
// Business logic (status, allowed_actions, ketersediaan, tagihan) selalu dari server; UI hanya presentasi.
import type {
  Announcement,
  AnnouncementCategory,
  BillSummary,
  Booking,
  CreateBookingInput,
  CreateSRInput,
  CreateVisitorInput,
  DeviceRegistration,
  DocumentLink,
  Facility,
  FeedbackInput,
  Invoice,
  LoginResult,
  Member,
  MemberCreated,
  MemberInput,
  Message,
  Notification,
  NotificationPreference,
  NotificationPreferenceUpdate,
  Option,
  Package,
  Page,
  ParkingArea,
  ParkingPermit,
  Payment,
  PaymentProof,
  PaymentProvider,
  PermitInput,
  PushConfig,
  RegisterInput,
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
  UpdateMeInput,
  Vehicle,
  VehicleInput,
  Visitor,
} from "./types";

export interface TenantApi {
  readonly mode: "mock" | "http";
  // auth & akun (TD-P1-003: akun tenant = users + tenant_users, client `tenant_app`)
  login(email: string, password: string): Promise<LoginResult>;
  register(input: RegisterInput): Promise<RegisterResult>;
  me(): Promise<TenantUser>;
  updateMe(input: UpdateMeInput): Promise<TenantUser>;
  logout(): Promise<void>;
  changePassword(current: string, next: string): Promise<void>;
  // master registrasi (publik, rate-limited)
  properties(): Promise<Option[]>;
  floors(propertyId: string): Promise<Option[]>;
  units(propertyId: string, floorId: string): Promise<Option[]>;
  // My Unit (PRD P3 v2.1 §5.2)
  myUnits(): Promise<UnitSummary[]>;
  myUnit(id: string): Promise<UnitSummary>;
  // Tenant Admin — anggota tenant (P3-ACC-08)
  members(): Promise<Member[]>;
  createMember(input: MemberInput): Promise<MemberCreated>;
  deactivateMember(tenantUserId: string): Promise<Member>;
  reactivateMember(tenantUserId: string): Promise<Member>;
  setMemberUnits(tenantUserId: string, unitIds: string[]): Promise<Member>;
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
  /** Pesan + lampiran foto opsional (P3-SRQ-05): foto diunggah ke object SR lalu dikirim sebagai attachment_ids. */
  sendMessage(id: string, body: string, photos?: Blob[]): Promise<Message>;
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
  // Package (P3-PKG-02)
  packages(params?: { waiting?: boolean; cursor?: string | null }): Promise<Page<Package>>;
  package(id: string): Promise<Package>;
  // Parking (P3-PRK-01..03)
  vehicles(): Promise<Vehicle[]>;
  /** Detail kendaraan + riwayat izin; `documents` (STNK/foto) hanya untuk pemilik. */
  vehicle(id: string): Promise<Vehicle>;
  createVehicle(input: VehicleInput, document?: Blob | null): Promise<Vehicle>;
  updateVehicle(id: string, input: VehicleInput): Promise<Vehicle>;
  removeVehicle(id: string): Promise<void>;
  uploadVehicleDocument(id: string, file: Blob): Promise<void>;
  parkingAreas(): Promise<ParkingArea[]>;
  /** Seluruh izin parkir kendaraan yang terlihat akun ini (terbaru dulu); filter status opsional. */
  parkingPermits(params?: { status?: string[] }): Promise<ParkingPermit[]>;
  requestPermit(input: PermitInput): Promise<ParkingPermit>;
  permit(id: string): Promise<ParkingPermit>;
  cancelPermit(id: string): Promise<ParkingPermit>;
  // Feedback umum (P3-FDB-02)
  feedbackList(params?: { cursor?: string | null }): Promise<Page<TenantFeedback>>;
  feedback(id: string): Promise<TenantFeedback>;
  createFeedback(input: FeedbackInput, photos?: Blob[]): Promise<TenantFeedback>;
  // Bills & payment (PRD §23; P4 v2.1 §10 Tenant-Facing Finance)
  billSummary(): Promise<BillSummary>;
  bills(params?: { open?: boolean }): Promise<Invoice[]>;
  bill(id: string): Promise<Invoice>;
  paymentProviders(): Promise<PaymentProvider[]>;
  payBill(id: string, providerCode: string, method: string): Promise<Payment>;
  /** B-14: filter invoice di server (`?invoice_id=`), bukan menyaring 50 baris pertama di browser. */
  payments(invoiceId?: string): Promise<Payment[]>;
  payment(id: string): Promise<Payment>;
  paymentProofs(paymentId: string): Promise<PaymentProof[]>;
  uploadPaymentProof(paymentId: string, file: Blob, fileName?: string): Promise<void>;
  invoiceDocumentLink(invoiceId: string): Promise<DocumentLink>;
  receiptDocumentLink(paymentId: string): Promise<DocumentLink>;
  statement(params?: { from?: string; to?: string }): Promise<Statement>;
  statementLink(params?: { from?: string; to?: string }): Promise<DocumentLink>;
  balances(): Promise<TenantBalances>;
  // Inbox (PRD §20) & pengumuman (P3-ANN-05/06)
  notifications(): Promise<Notification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
  unreadCount(): Promise<number>;
  announcements(params?: { cursor?: string | null; category?: AnnouncementCategory | null }): Promise<Page<Announcement>>;
  announcement(id: string): Promise<Announcement>;
  acknowledgeAnnouncement(id: string): Promise<Announcement>;
  // Preferensi notifikasi & push (P3-ACC-09, P3-PSH-01..04)
  notificationPreferences(): Promise<NotificationPreference[]>;
  /** Kirim hanya kanal yang berubah; kanal lain tetap (merge di server). */
  setNotificationPreference(pref: NotificationPreferenceUpdate): Promise<void>;
  pushConfig(): Promise<PushConfig>;
  registerDevice(input: DeviceRegistration): Promise<void>;
  /** Hapus perangkat push: endpoint Web Push atau token FCM. */
  unregisterDevice(tokenOrEndpoint: string): Promise<void>;
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
