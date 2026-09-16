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
}

// ---------- Service Request (Ticket) ----------

export type SRStatus = "new" | "acknowledged" | "assigned" | "in_progress" | "waiting_for_tenant" | "resolved" | "closed" | "cancelled";
export type TenantStatus = "submitted" | "received" | "being_assigned" | "in_progress" | "need_your_response" | "resolved" | "closed" | "cancelled";
export type Priority = "low" | "medium" | "high" | "critical";
export type AreaScope = "unit" | "common_area" | "other";

export interface SRCategory {
  id?: string;
  code: string;
  name: string;
  icon: string;
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

export interface Message {
  id: string;
  author_kind: "tenant" | "staff" | "system";
  author_name: string | null;
  body: string;
  attachment_ids: string[];
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
  allowed_actions: string[];
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

export interface Announcement {
  id: string;
  title: string;
  excerpt: string | null;
  body: string;
  importance: string;
  published_at: string | null;
  expires_at: string | null;
  image_url?: string;
}

export interface Page<T> {
  data: T[];
  next_cursor: string | null;
}
