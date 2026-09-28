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
    // tanggal LOKAL (slot mock dibuat dalam waktu lokal); toISOString() = tanggal UTC → gagal antara 00:00–07:00 WIB
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

  it("P3 v2.1: unit saya (2 unit), paket menunggu, izin parkir tunggal per kendaraan", async () => {
    await mockApi.login("yosep@demo.buildingvision.id", "Demo12345!");
    const units = await mockApi.myUnits();
    expect(units).toHaveLength(2);
    expect(units[0].unit.is_primary).toBe(true);
    expect(units[0].counts.packages_waiting).toBe(2);
    expect(units[0].people.some((p) => p.is_self)).toBe(true);
    // kepemilikan hanya pada unit utama (server: null pada unit lain)
    expect(units[0].ownership_status).toBe("owner");
    expect(units[1].ownership_status).toBeNull();
    expect((await mockApi.packages({ waiting: true })).data.every((p) => ["received", "notified"].includes(p.status))).toBe(true);
    const v = await mockApi.createVehicle({ plate_number: "b 9999 zz", vehicle_type: "car" }, null);
    expect(v.plate_number).toBe("B 9999 ZZ");
    await expect(mockApi.createVehicle({ plate_number: "B 9999 ZZ" })).rejects.toSatisfy((e: unknown) => isApiError(e) && e.code === "VEHICLE_EXISTS");
    const permit = await mockApi.requestPermit({ vehicle_id: v.id, permit_type: "monthly" });
    expect(permit.status).toBe("requested");
    expect(permit.allowed_actions).toContain("cancel");
    await expect(mockApi.requestPermit({ vehicle_id: v.id, permit_type: "annual" })).rejects.toSatisfy((e: unknown) => isApiError(e) && e.code === "PERMIT_EXISTS");
    expect((await mockApi.cancelPermit(permit.id)).status).toBe("cancelled");
    // daftar izin (GET /tenant/parking-permits) terbaru dulu + filter status
    const permits = await mockApi.parkingPermits();
    expect(permits[0].id).toBe(permit.id);
    expect((await mockApi.parkingPermits({ status: ["approved"] })).every((p) => p.status === "approved")).toBe(true);
    // detail kendaraan membawa dokumen STNK untuk pemilik; unggahan baru ikut tampil
    const detail = await mockApi.vehicle("veh-1");
    expect(detail.documents?.length).toBe(1);
    await mockApi.uploadVehicleDocument(v.id, new Blob(["x"], { type: "image/jpeg" }));
    const vd = await mockApi.vehicle(v.id);
    expect(vd.documents?.map((d) => d.attachment_type)).toEqual(["photo"]);
    expect(vd.document_count).toBe(1);
    await expect(mockApi.removeVehicle("veh-1")).rejects.toSatisfy((e: unknown) => isApiError(e) && e.code === "PERMIT_ACTIVE");
  });

  it("P3 v2.1: akun ditolak membawa meta; password sementara wajib diganti; anggota tenant", async () => {
    await expect(mockApi.login("ditolak@demo.buildingvision.id", "Demo12345!")).rejects.toSatisfy((e: unknown) => isApiError(e) && e.code === "ACCOUNT_REJECTED" && !!e.problem.meta?.reason && !!e.problem.meta?.whatsapp_number);
    const temp = await mockApi.login("sementara@demo.buildingvision.id", "Sementara123");
    expect(temp.must_change_password).toBe(true);
    // seperti server: selain /tenant/me, ganti password, dan push config → 403 PASSWORD_CHANGE_REQUIRED
    expect((await mockApi.me()).must_change_password).toBe(true);
    await expect(mockApi.notifications()).rejects.toSatisfy((e: unknown) => isApiError(e) && e.status === 403 && e.code === "PASSWORD_CHANGE_REQUIRED");
    await expect(mockApi.registerDevice({ platform: "web", token: "t" })).rejects.toSatisfy((e: unknown) => isApiError(e) && e.code === "PASSWORD_CHANGE_REQUIRED");
    await mockApi.pushConfig();
    await mockApi.changePassword("Sementara123", "Baru12345");
    expect((await mockApi.me()).must_change_password).toBe(false);
    await expect(mockApi.members()).rejects.toSatisfy((e: unknown) => isApiError(e) && e.status === 403);
    await mockApi.login("yosep@demo.buildingvision.id", "Demo12345!");
    const created = await mockApi.createMember({ full_name: "Staf Baru", email: "staf.baru@tenant.test", unit_ids: ["fl-pinus-1-u2"] });
    expect(created.temporary_password.length).toBeGreaterThanOrEqual(8);
    expect((await mockApi.deactivateMember(created.member.tenant_user_id)).status).toBe("suspended");
    expect((await mockApi.reactivateMember(created.member.tenant_user_id)).status).toBe("active");
  });

  it("pesan SR: foto tanpa teks diterima, tanpa teks & tanpa foto ditolak", async () => {
    await mockApi.login("yosep@demo.buildingvision.id", "Demo12345!");
    const m = await mockApi.sendMessage("sr-1003", "", [new Blob(["x"], { type: "image/jpeg" })]);
    expect(m.body).toBe("");
    expect(m.attachments).toHaveLength(1);
    await expect(mockApi.sendMessage("sr-1003", "  ")).rejects.toSatisfy((e: unknown) => isApiError(e) && e.status === 400);
  });

  it("profil: phone kosong mengosongkan nomor; preferensi notifikasi digabung per kanal", async () => {
    await mockApi.login("yosep@demo.buildingvision.id", "Demo12345!");
    expect((await mockApi.updateMe({ phone: "" })).phone).toBeNull();
    const [first] = await mockApi.notificationPreferences();
    await mockApi.setNotificationPreference({ type: first.type, push: !first.push });
    const after = (await mockApi.notificationPreferences()).find((p) => p.type === first.type)!;
    expect(after).toMatchObject({ push: !first.push, inapp: first.inapp, email: first.email });
  });

  it("P4 v2.1: pembayaran manual → unggah bukti; statement & saldo; pengumuman konfirmasi", async () => {
    await mockApi.login("yosep@demo.buildingvision.id", "Demo12345!");
    const pay = await mockApi.payBill("inv-1", "manual", "transfer");
    expect(pay.allowed_actions).toContain("upload_proof");
    await expect(mockApi.receiptDocumentLink(pay.id)).rejects.toSatisfy((e: unknown) => isApiError(e) && e.status === 409 && e.code === "RECEIPT_NOT_AVAILABLE");
    await mockApi.uploadPaymentProof(pay.id, new Blob(["x"], { type: "image/jpeg" }), "bukti.jpg");
    expect(await mockApi.paymentProofs(pay.id)).toHaveLength(1);
    expect((await mockApi.payments("inv-1")).every((p) => p.invoice_id === "inv-1")).toBe(true);
    const st = await mockApi.statement();
    expect(st.closing_balance).toBe(st.opening_balance + st.total_debit - st.total_credit);
    expect((await mockApi.balances()).deposit_balance).toBeGreaterThan(0);
    const alerts = await mockApi.announcements({ category: "alert" });
    expect(alerts.data.every((a) => a.category === "alert")).toBe(true);
    const acked = await mockApi.acknowledgeAnnouncement(alerts.data[0].id);
    expect(acked.acknowledged_at).toBeTruthy();
  });
});
