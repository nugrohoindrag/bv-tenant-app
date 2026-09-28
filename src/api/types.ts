// Model Tenant App — mengikuti respons backend BuildingVision P1 (`/api/v1/tenant/*`, contracts/openapi/v1.yaml), snake_case.
// Service Request = object kanonik (NC §9); status internal kanonik + `tenant_status` tenant-facing (PRD P1 §14, TD-P1-008).
// Tenant TIDAK menerima Work Order/Task internal, catatan internal, komentar staf, biaya, atau assignment terbatas (PRD §20).

export type Gender = "male" | "female";
export type OwnershipStatus = "owner" | "tenant" | "family" | "guest" | "employee";
export type AccountStatus = "pending_validation" | "active" | "rejected" | "suspended";
export type ProfileCode = "hotel" | "apartment" | "office";
export interface Term {
  id: string;
  en: string;
}

export interface AccessLoc {
  id: string;
  access_id: string;
  location_type: string;
  name: string;
  code: string;
  unit_number?: string | null;
  path_text: string;
  is_primary: boolean;
  access_type?: string;
}

/** GET /tenant/me — identitas + scope akses (AT-P1-001) + terminologi profile + capability property. */
export interface TenantUser {
  id: string;
  tenant_user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: "tenant_user" | "tenant_admin";
  account_status: AccountStatus;
  ownership_status: OwnershipStatus | null;
  organization: { id: string; slug: string; name: string };
  property: { id: string; name: string; code: string; profile: ProfileCode; timezone: string; terminology: Record<string, Term> };
  tenant: { id: string; name: string; code: string } | null;
  units: AccessLoc[];
  areas: AccessLoc[];
  primary_unit: AccessLoc | null;
  features: { expose_sla: boolean; confirmation_required: boolean; csat_enabled: boolean; booking_approval_required: boolean; visitor_approval_required: boolean };
  capabilities: string[];
  last_seen_at: string | null;
  // PRD P3 v2.1: wajib ganti password (P3-ACC-03), WhatsApp pengelola property (P3-WAM-05), Tenant Admin (P3-ACC-08)
  must_change_password?: boolean;
  whatsapp_number?: string | null;
  is_tenant_admin?: boolean;
}

/** PATCH /tenant/me (P3-ACC-04). */
export interface UpdateMeInput {
  full_name?: string;
  /** String kosong mengosongkan nomor telepon (server menyimpan NULL). */
  phone?: string;
}

/** `meta` problem login akun tenant non-aktif (B-08 / P3-ACC-07). */
export interface AccountStatusMeta {
  account_status?: AccountStatus | string;
  reason?: string;
  property_name?: string;
  whatsapp_number?: string;
}

// ---------- My Unit (P3-UNT-01..04) ----------

export interface UnitPerson {
  name: string;
  role: "occupant" | "tenant_user" | "tenant_admin" | string;
  relation?: string | null;
  is_self: boolean;
}

export interface UnitCounts {
  open_requests: number;
  unpaid_invoices: number;
  outstanding_amount: number;
  upcoming_bookings: number;
  upcoming_visitors: number;
  packages_waiting: number;
  active_parking_permits: number;
}

/** GET /tenant/units(/{id}) — identitas unit, kepemilikan/hunian, tenant, penghuni, ringkasan. */
export interface UnitSummary {
  unit: AccessLoc;
  unit_type: string | null;
  area_m2: number | null;
  occupancy_status: string | null;
  ownership_status: OwnershipStatus | string | null;
  tenant: { id: string; name: string; code?: string | null } | null;
  people: UnitPerson[];
  other_access: AccessLoc[];
  counts: UnitCounts;
}

// ---------- Tenant Admin: anggota (P3-ACC-08) ----------

export interface Member {
  tenant_user_id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: "tenant_user" | "tenant_admin" | string;
  status: AccountStatus | string;
  is_self: boolean;
  units: AccessLoc[];
  last_seen_at: string | null;
  can_manage: boolean;
}

export interface MemberInput {
  full_name: string;
  email: string;
  phone?: string;
  unit_ids?: string[];
}

export interface MemberCreated {
  member: Member;
  temporary_password: string;
}

// ---------- Notifikasi: preferensi & push (P3-ACC-09, P3-PSH-01..04) ----------

export type PreferenceCategory = "request" | "billing" | "announcement" | "booking" | "visitor" | "package" | "parking" | "account" | "feedback" | "other";

export interface NotificationPreference {
  type: string;
  inapp: boolean;
  push: boolean;
  email: boolean;
  email_available?: boolean;
  category?: PreferenceCategory | string;
}

/** PUT /notifications/preferences — server menggabungkan: kanal yang tidak dikirim mempertahankan nilai lama. */
export type NotificationPreferenceUpdate = Pick<NotificationPreference, "type"> & Partial<Pick<NotificationPreference, "inapp" | "push" | "email">>;

export interface PushConfig {
  web_push: { enabled: boolean; public_key?: string };
  fcm: { enabled: boolean };
  devices: { platform: string; push_kind: string; app: string; last_seen_at: string; token_hint: string }[];
}

/** POST /me/devices — hanya field yang dikenal server (DisallowUnknownFields). `app` & user agent ditentukan server. */
export interface DeviceRegistration {
  platform: "web" | "android" | "ios";
  token?: string;
  device_id?: string;
  app_version?: string;
  subscription?: { endpoint: string; keys: { p256dh: string; auth: string } };
}

export interface ReportableLocation {
  id: string;
  location_type: string;
  name: string;
  path_text: string;
  scope: AreaScope;
  is_primary: boolean;
}

export interface Option {
  id: string;
  name: string;
  code?: string;
  parent_id?: string | null;
  profile?: string;
  /** Registrasi property: nomor WhatsApp pengelola (E.164 tanpa '+', mis. 628112222333) bila diisi (P3-COM-02). */
  whatsapp_number?: string | null;
}

export interface RegisterInput {
  first_name: string;
  last_name: string;
  gender: Gender | null;
  phone: string;
  email: string;
  password: string;
  property_id: string;
  unit_id: string;
  ownership_status: OwnershipStatus;
}

export interface RegisterResult {
  tenant_user_id: string;
  user_id: string;
  account_status: AccountStatus;
  message: string;
}

export interface LoginResult {
  user: TenantUser;
  access_token: string;
  refresh_token?: string;
  must_change_password?: boolean;
}

// ---------- Service Request (Ticket) ----------

export type SRStatus = "new" | "acknowledged" | "assigned" | "in_progress" | "waiting_for_tenant" | "resolved" | "closed" | "cancelled";
export type TenantStatus = "submitted" | "received" | "being_assigned" | "in_progress" | "need_your_response" | "resolved" | "closed" | "cancelled";
export type Priority = "low" | "medium" | "high" | "critical";
export type AreaScope = "unit" | "common_area" | "other";

// PRD P1 v2 §27.2 — jenis permintaan tenant.
export type RequestType = "service_request" | "complaint" | "maintenance_request" | "cleaning_request" | "facility_issue" | "other";

export interface SRCategory {
  id?: string;
  code: string;
  name: string;
  icon: string;
  request_type?: RequestType | null; // default jenis untuk kategori ini
  default_priority?: Priority;
  is_active?: boolean;
  description?: string | null;
}

export interface Photo {
  id: string;
  attachment_type?: string;
  kind: "problem" | "resolution" | "reopen" | string;
  url: string;
  thumb_url?: string;
  content_type?: string;
  status?: string;
  uploaded_at?: string;
}

export interface TimelineEvent {
  id: string;
  key: string; // submitted | received | being_assigned | in_progress | need_your_response | resolved | closed | cancelled | reopened | message | ...
  title: string;
  detail?: string | null;
  actor_kind: "tenant" | "staff" | "system";
  occurred_at: string;
}

export interface Feedback {
  rating: number;
  comment: string | null;
  created_at: string;
}

/** Lampiran pesan SR (P3-SRQ-05) — URL bertanda tangan berlaku singkat. */
export interface MessageAttachment {
  id: string;
  content_type: string;
  file_name: string | null;
  url: string;
  thumb_url?: string;
}

export interface Message {
  id: string;
  author_kind: "tenant" | "staff" | "system";
  author_name: string | null;
  body: string;
  attachment_ids: string[];
  attachments?: MessageAttachment[];
  created_at: string;
  read_at: string | null;
}

export interface ServiceRequest {
  id: string;
  request_number: string;
  title: string;
  description: string | null;
  category_code: string;
  category_name: string | null;
  category_icon: string | null;
  request_type?: RequestType;
  status: SRStatus;
  tenant_status: TenantStatus;
  priority: Priority;
  area_scope: AreaScope | null;
  location: { id: string | null; name: string | null; path_text: string | null };
  property_name: string;
  assigned_team: string | null;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  confirmed_at: string | null;
  due_estimate_at: string | null;
  resolution: string | null;
  reopen_count: number;
  contact_preference: string | null;
  preferred_visit_at: string | null;
  additional_note: string | null;
  photos: Photo[];
  message_count: number;
  unread_messages: number;
  feedback: Feedback | null;
  timeline?: TimelineEvent[];
  allowed_actions: string[]; // cancel | confirm | reopen | feedback | message
  version: number;
}

export interface CreateSRInput {
  category_code: string;
  request_type?: RequestType | null;
  title: string;
  description: string;
  area_scope: AreaScope;
  location_id: string | null;
  location_label: string;
  contact_preference?: string | null;
  preferred_visit_at?: string | null;
  additional_note?: string | null;
  photos: Blob[];
  idempotency_key: string;
}

// ---------- Facility Booking ----------

export interface Facility {
  id: string;
  facility_code: string;
  name: string;
  description: string | null;
  facility_type: string;
  location_path: string | null;
  capacity: number | null;
  effective_approval: boolean;
  slot_minutes: number;
  min_duration_minutes: number;
  max_duration_minutes: number;
  advance_booking_days: number;
  open_time: string;
  close_time: string;
  weekdays: number[];
  rules: string | null;
  is_active: boolean;
}

export interface Slot {
  starts_at: string;
  ends_at: string;
  available: boolean;
  reason?: string;
}

export interface Booking {
  id: string;
  booking_number: string;
  facility_id: string;
  facility_name: string;
  facility_type: string;
  starts_at: string;
  ends_at: string;
  attendees: number | null;
  purpose: string | null;
  notes: string | null;
  status: string; // pending | confirmed | checked_in | completed | cancelled | rejected | no_show
  rejection_reason: string | null;
  cancel_reason: string | null;
  created_at: string;
  allowed_actions: string[];
}

export interface CreateBookingInput {
  facility_id: string;
  starts_at: string;
  ends_at: string;
  attendees?: number | null;
  purpose?: string | null;
  notes?: string | null;
}

// ---------- Visitor ----------

export interface VisitorPass {
  id: string;
  pass_code: string;
  qr_payload: string;
  valid_from: string;
  valid_until: string;
  status: string;
  used_at: string | null;
}

export interface Visitor {
  id: string;
  visitor_number: string;
  host_unit_label: string | null;
  visitor_name: string;
  visitor_phone: string | null;
  visitor_company: string | null;
  purpose: string | null;
  vehicle_plate: string | null;
  headcount: number;
  expected_at: string;
  expected_until: string | null;
  status: string; // pending_approval | registered | checked_in | checked_out | cancelled | expired | denied
  denied_reason: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  created_at: string;
  pass?: VisitorPass | null;
  allowed_actions: string[];
}

export interface CreateVisitorInput {
  visitor_name: string;
  visitor_phone?: string | null;
  visitor_company?: string | null;
  purpose?: string | null;
  vehicle_plate?: string | null;
  headcount?: number;
  expected_at: string;
  expected_until?: string | null;
  host_unit_location_id?: string | null;
}

// ---------- Billing ----------

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  unit_label: string | null;
  invoice_type: string;
  period_start: string | null;
  period_end: string | null;
  description: string | null;
  currency_code: string;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  issued_at: string | null;
  due_at: string;
  paid_at: string | null;
  status: string; // draft | issued | partially_paid | paid | overdue | cancelled
  items: InvoiceItem[];
  payment_count: number;
  allowed_actions: string[]; // view | download_pdf | pay
  // PRD P4 v2.1
  credited_amount?: number;
  days_overdue?: number;
  penalty_accrued?: number;
  cancel_reason?: string | null;
}

export interface BillSummary {
  outstanding_amount: number;
  unpaid_count: number;
  overdue_count: number;
  next_due_at: string | null;
  currency_code: string;
}

export interface PaymentProvider {
  code: string;
  name: string;
  is_active: boolean;
  methods: string[];
  config: Record<string, unknown>;
}

export interface Payment {
  id: string;
  payment_number: string;
  invoice_id: string;
  invoice_number: string;
  amount: number;
  currency_code: string;
  provider_code: string;
  method: string;
  status: string; // initiated | pending | paid | failed | expired | cancelled | refunded
  checkout_url: string | null;
  va_number: string | null;
  qr_string: string | null;
  instructions: string | null;
  expires_at: string | null;
  paid_at: string | null;
  receipt_number: string | null;
  failure_reason: string | null;
  created_at: string;
  // PRD P4 v2.1 (P4-VRF-02, P4-RCP-02): allowed_actions view | download_receipt | upload_proof
  allowed_actions?: string[];
  proof_count?: number;
  reference?: string | null;
  verified_at?: string | null;
  refunded_at?: string | null;
  refund_reason?: string | null;
}

/** Bukti transfer (lampiran object payment) — GET /tenant/payments/{id}/proofs. */
export interface PaymentProof {
  id: string;
  content_type: string;
  file_name: string | null;
  url: string;
  thumb_url?: string;
  uploaded_at: string;
}

/** Tautan dokumen bertanda tangan (PDF invoice / kwitansi / statement) — dapat dibuka tanpa header Authorization. */
export interface DocumentLink {
  url: string;
  expires_at: string;
  file_name?: string;
}

export interface StatementEntry {
  date: string;
  kind: "invoice" | "void" | "credit_note" | "payment" | "refund" | "credit" | string;
  reference: string | null;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  object_type: string;
  object_id: string;
}

/** Statement of account tenant (P4-OUT-02, P4-TNT-03). closing_balance + = terutang, − = kelebihan bayar. */
export interface Statement {
  property_id: string;
  property_name: string;
  tenant_id: string | null;
  tenant_name: string | null;
  unit_location_id: string | null;
  unit_label: string | null;
  from: string;
  to: string;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  outstanding_amount: number;
  credit_balance: number;
  deposit_balance: number;
  entries: StatementEntry[];
  currency_code: string;
  generated_at: string;
}

/** Saldo deposit & kredit tenant (P4-TNT-06). */
export interface TenantBalances {
  deposit_balance: number;
  credit_balance: number;
  outstanding_amount: number;
  currency_code: string;
}

// ---------- Package (P3-PKG-02) ----------

export interface PackagePhoto {
  id: string;
  attachment_type: string;
  url?: string;
  thumb_url?: string;
}

export interface Package {
  id: string;
  package_number: string;
  unit_location_id: string | null;
  unit_name: string | null;
  tenant_name: string | null;
  recipient_name: string;
  package_type: "document" | "parcel" | "food" | "large" | "other" | string;
  courier: string | null;
  tracking_number: string | null;
  description: string | null;
  storage_location: string | null;
  status: "received" | "notified" | "picked_up" | "returned" | string;
  received_at: string;
  notified_at: string | null;
  reminder_count: number;
  picked_up_at: string | null;
  picked_up_by_name: string | null;
  handover_note: string | null;
  returned_at: string | null;
  return_reason: string | null;
  days_waiting: number;
  photos: PackagePhoto[];
  allowed_actions: string[];
}

// ---------- Parking (P3-PRK-01..03) ----------

export type VehicleType = "car" | "motorcycle" | "truck" | "bicycle" | "other";
export type PermitType = "monthly" | "annual" | "temporary";

export interface ParkingPermit {
  id: string;
  permit_number: string;
  vehicle_id: string;
  plate_number: string;
  vehicle_type: string;
  vehicle_label: string;
  unit_location_id: string | null;
  unit_name: string | null;
  requested_by_name: string | null;
  parking_area_id: string | null;
  parking_area_name: string | null;
  permit_type: PermitType | string;
  status: "requested" | "approved" | "rejected" | "cancelled" | "expired" | "revoked" | string;
  is_active: boolean;
  valid_from: string | null; // YYYY-MM-DD
  valid_until: string | null; // YYYY-MM-DD
  sticker_number: string | null;
  fee_amount: number | null;
  notes: string | null;
  decision_reason: string | null;
  decided_at: string | null;
  requested_at: string;
  allowed_actions: string[]; // view | cancel
}

/** Dokumen kendaraan (foto/PDF STNK) — hanya dikirim ke pemilik kendaraan pada GET /tenant/vehicles/{id}. */
export interface VehicleDocument {
  id: string;
  attachment_type: string;
  file_name: string | null;
  content_type: string;
  url: string;
  thumb_url?: string;
  uploaded_at: string;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: VehicleType | string;
  brand: string | null;
  color: string | null;
  unit_location_id: string | null;
  unit_name: string | null;
  status: string;
  permit_until: string | null;
  permit_valid: boolean;
  is_mine: boolean;
  permits: ParkingPermit[];
  document_count: number;
  /** Hanya pada detail (GET /tenant/vehicles/{id}) dan hanya untuk pemilik (`is_mine`). */
  documents?: VehicleDocument[];
}

export interface VehicleInput {
  plate_number?: string;
  vehicle_type?: VehicleType | string;
  brand?: string;
  color?: string;
  unit_id?: string | null;
}

export interface ParkingArea {
  id: string;
  name: string;
  code: string;
  area_type: string;
}

export interface PermitInput {
  vehicle_id: string;
  permit_type: PermitType;
  parking_area_id?: string | null;
  valid_from?: string | null; // YYYY-MM-DD
  notes?: string | null;
}

// ---------- Feedback umum (P3-FDB-02) ----------

export type FeedbackCategory = "suggestion" | "compliment" | "complaint" | "question" | "other";

export interface TenantFeedback {
  id: string;
  feedback_number: string;
  category: FeedbackCategory | string;
  subject: string | null;
  body: string;
  is_anonymous: boolean;
  status: "new" | "in_review" | "responded" | "closed" | string;
  response: string | null;
  responded_at: string | null;
  created_at: string;
  photos: { id: string; url?: string; thumb_url?: string }[];
}

export interface FeedbackInput {
  category: FeedbackCategory;
  subject?: string;
  body: string;
  is_anonymous: boolean;
  unit_id?: string | null;
}

// ---------- Inbox ----------

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  object_type: string | null;
  object_id: string | null;
  deep_link: string | null;
  severity: string;
  created_at: string;
  read_at: string | null;
}

export type AnnouncementCategory = "announcement" | "news" | "alert";

export interface Announcement {
  id: string;
  title: string;
  excerpt: string | null;
  body: string;
  importance: string; // normal | important (lama; tampilan memakai category & severity)
  category?: AnnouncementCategory | string; // D-P3-06: News = kategori pengumuman
  severity?: "info" | "warning" | "critical" | string;
  requires_ack?: boolean;
  read_at?: string | null;
  acknowledged_at?: string | null;
  published_at: string | null;
  expires_at: string | null;
  image_url?: string;
}

export interface Page<T> {
  data: T[];
  next_cursor: string | null;
}
