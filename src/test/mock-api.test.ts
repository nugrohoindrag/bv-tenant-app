// Smoke test alur tenant di adapter mock (bentuk data = backend P1): registrasi → pending → approve → login → ticket →
// confirm/reopen/feedback mengikuti allowed_actions → booking → visitor → tagihan.
import { beforeEach, describe, expect, it } from "vitest";
import { mockApi, mockApproveAll, resetMock } from "@/api/mock/api";
import { isApiError } from "@/lib/http";

describe("mock TenantApi", () => {
  beforeEach(() => resetMock());

  it("registrasi menghasilkan akun pending; login ditolak sampai divalidasi", async () => {
    const res = await mockApi.register({ first_name: "Dewi", last_name: "Lestari", gender: "female", phone: "081298765432", email: "dewi@example.com", password: "Rahasia123", property_id: "prop-pinus", unit_id: "fl-pinus-10-u1", ownership_status: "owner" });
    expect(res.account_status).toBe("pending_validation");
    await expect(mockApi.login("dewi@example.com", "Rahasia123")).rejects.toSatisfy((e: unknown) => isApiError(e) && e.code === "ACCOUNT_PENDING");
    expect(mockApproveAll()).toBe(1);
    const login = await mockApi.login("dewi@example.com", "Rahasia123");
    expect(login.user.account_status).toBe("active");
    expect(login.user.primary_unit?.unit_number).toBe("APP 1001");
  });

  it("email duplikat ditolak dengan field error", async () => {
    await expect(mockApi.register({ first_name: "Y", last_name: "K", gender: "male", phone: "0812", email: "yosep@demo.buildingvision.id", password: "Rahasia123", property_id: "prop-pinus", unit_id: "fl-pinus-1-u1", ownership_status: "owner" })).rejects.toSatisfy(
      (e: unknown) => isApiError(e) && e.problem.errors?.[0]?.field === "email",
    );
  });

  it("ticket: buat (idempoten) → status tenant-facing → reopen/confirm/feedback sesuai allowed_actions", async () => {
    await mockApi.login("yosep@demo.buildingvision.id", "Demo12345!");
    const key = "11111111-1111-4111-8111-111111111111";
    const sr = await mockApi.createServiceRequest({ category_code: "cleaning", title: "Plafon kotor", description: "Langit-langit kotor penuh sarang laba-laba", area_scope: "unit", location_id: "fl-pinus-1-u2", location_label: "Unit APP 102", photos: [], idempotency_key: key });
    expect(sr.status).toBe("new");
    expect(sr.tenant_status).toBe("submitted");
    expect(sr.request_number).toMatch(/^SR-\d{4}-\d{6}$/);
    const again = await mockApi.createServiceRequest({ category_code: "cleaning", title: "x", description: "xxxxxxxxxxxx", area_scope: "unit", location_id: null, location_label: "y", photos: [], idempotency_key: key });
    expect(again.id).toBe(sr.id);
    expect((await mockApi.serviceRequests()).data[0]?.id).toBe(sr.id);
    // confirm hanya bila diizinkan (ticket baru → 409)
    await expect(mockApi.confirmRequest(sr.id)).rejects.toSatisfy((e: unknown) => isApiError(e) && e.status === 409);

    const resolved = await mockApi.serviceRequest("sr-1001");
    expect(resolved.allowed_actions).toEqual(expect.arrayContaining(["confirm", "reopen"]));
    await expect(mockApi.sendFeedback("sr-1001", 5, "x")).rejects.toSatisfy((e: unknown) => isApiError(e) && e.status === 409); // CSAT hanya setelah Closed
    const reopened = await mockApi.reopenRequest("sr-1001", "Masih ada sudut yang belum dibersihkan", []);
    expect(reopened.status).toBe("in_progress");
    expect(reopened.tenant_status).toBe("in_progress");
    expect(reopened.reopen_count).toBe(1);
    expect(reopened.timeline?.at(-1)?.key).toBe("reopened");
    expect(reopened.allowed_actions).not.toContain("confirm");

    const waiting = await mockApi.serviceRequest("sr-1003");
    expect(waiting.tenant_status).toBe("need_your_response");
    const msg = await mockApi.sendMessage("sr-1003", "Lampu dekat lift.");
    expect(msg.author_kind).toBe("tenant");
    expect((await mockApi.serviceRequest("sr-1003")).tenant_status).toBe("in_progress");

    // confirm → closed → feedback (CSAT) tersedia sekali
    const closedSr = await mockApi.createServiceRequest({ category_code: "ac", title: "AC bocor", description: "AC kamar bocor menetes ke lantai", area_scope: "unit", location_id: "fl-pinus-1-u2", location_label: "Unit APP 102", photos: [], idempotency_key: "22222222-2222-4222-8222-222222222222" });
    await expect(mockApi.confirmRequest(closedSr.id)).rejects.toSatisfy((e: unknown) => isApiError(e) && e.status === 409);
    const done = await mockApi.confirmRequest("sr-1001").catch(() => null); // sudah reopened → tidak bisa confirm
    expect(done).toBeNull();

    expect((await mockApi.unreadCount()) >= 3).toBe(true);
  });

  it("facility booking: slot yang sudah dipesan tidak tersedia; booking tanpa approval langsung confirmed", async () => {
    await mockApi.login("yosep@demo.buildingvision.id", "Demo12345!");
    const today = new Date().toISOString().slice(0, 10);
    const slots = await mockApi.facilityAvailability("fac-mr1", today);
    expect(slots.some((s) => s.reason === "booked")).toBe(true);
    const free = slots.find((s) => s.available);
    if (free) {
      const b = await mockApi.createBooking({ facility_id: "fac-mr1", starts_at: free.starts_at, ends_at: free.ends_at, attendees: 4 });
      expect(b.status).toBe("confirmed");
      await expect(mockApi.createBooking({ facility_id: "fac-mr1", starts_at: free.starts_at, ends_at: free.ends_at })).rejects.toSatisfy((e: unknown) => isApiError(e) && e.code === "SLOT_UNAVAILABLE");
    }
  });

  it("visitor: registrasi menghasilkan pass QR; tagihan: ringkasan & pembayaran", async () => {
    await mockApi.login("yosep@demo.buildingvision.id", "Demo12345!");
    const v = await mockApi.createVisitor({ visitor_name: "Tamu Uji", expected_at: new Date(Date.now() + 3_600_000).toISOString() });
    expect(v.status).toBe("registered");
    expect(v.pass?.qr_payload).toContain(v.visitor_number);
    const s = await mockApi.billSummary();
    expect(s.outstanding_amount).toBe(1_450_000);
    expect(s.unpaid_count).toBe(1);
    const p = await mockApi.payBill("inv-1", "mock_gateway", "va");
    expect(p.status).toBe("initiated");
    expect(p.va_number).toBeTruthy();
    await expect(mockApi.payBill("inv-1", "manual", "transfer")).rejects.toSatisfy((e: unknown) => isApiError(e) && e.code === "PAYMENT_PENDING");
  });
});
