// Test adapter HTTP (P3-NFR-07): endpoint baru PRD P3/P4 v2.1 dengan fetch di-mock — path, method, query, dan body persis
// (server menolak field JSON yang tidak dikenal).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { httpApi } from "@/api/http/api";
import { ApiError, errorMessage, http, isApiError, isPasswordChangeRequired, setPasswordChangeRequiredHandler, tokenStore } from "@/lib/http";
import { accountStatusNotice } from "@/features/auth/LoginPage";

interface Call {
  url: string;
  method: string;
  body: unknown;
  headers: Record<string, string>;
}
type Reply = { status?: number; body?: unknown };
type Route = [method: string, match: string | RegExp, reply: (c: Call) => Reply];

function fakeRes(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, statusText: "", text: async () => (body === undefined ? "" : JSON.stringify(body)) } as unknown as Response;
}

/** Router fetch palsu: rute pertama yang cocok (method + potongan URL/regex) menjawab; semua panggilan dicatat. */
function mockFetch(routes: Route[]): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      const raw = init?.body;
      const call: Call = { url, method, body: typeof raw === "string" ? JSON.parse(raw) : raw, headers: (init?.headers ?? {}) as Record<string, string> };
      calls.push(call);
      const r = routes.find(([m, p]) => m === method && (typeof p === "string" ? url.includes(p) : p.test(url)));
      if (!r) return fakeRes(404, { type: "", title: "Not found", status: 404, code: "NOT_FOUND" });
      const out = r[2](call);
      return fakeRes(out.status ?? 200, out.body);
    }),
  );
  return calls;
}

const presignRoute = (id: string): Route => ["POST", "/api/v1/tenant/attachments/presign", () => ({ status: 201, body: { attachment_id: id, upload_url: "https://storage.test/put/" + id, storage_key: "k/" + id, expires_at: "2026-09-28T00:00:00Z", method: "PUT", headers: { "Content-Type": "image/jpeg" } } })];
const uploadRoute: Route = ["PUT", "https://storage.test/put/", () => ({ status: 200 })];
const confirmRoute: Route = ["POST", /\/api\/v1\/tenant\/attachments\/[^/]+\/confirm$/, () => ({ body: { id: "x", status: "ready" } })];

describe("httpApi (PRD P3/P4 v2.1)", () => {
  beforeEach(() => tokenStore.set({ access_token: "tok", refresh_token: "ref" }));
  afterEach(() => {
    vi.unstubAllGlobals();
    tokenStore.set(null);
  });

  it("login membawa must_change_password dari token pair ke user (P3-ACC-03)", async () => {
    mockFetch([
      ["POST", "/api/v1/auth/login", () => ({ body: { access_token: "a1", refresh_token: "r1", access_expires_at: "", refresh_expires_at: "", token_type: "Bearer", must_change_password: true } })],
      ["GET", "/api/v1/tenant/me", () => ({ body: { id: "u1", full_name: "Rudi", must_change_password: false } })],
    ]);
    const res = await httpApi.login("rudi@tenant.test", "Temp1234");
    expect(res.must_change_password).toBe(true);
    expect(res.user.must_change_password).toBe(true);
    expect(tokenStore.get()?.access_token).toBe("a1");
  });

  it("login akun ditolak: problem meta (status, alasan, WhatsApp) diteruskan ke layar login (B-08)", async () => {
    mockFetch([["POST", "/api/v1/auth/login", () => ({ status: 403, body: { type: "x", title: "Account rejected", status: 403, code: "ACCOUNT_REJECTED", detail: "Pendaftaran akun ditolak", meta: { account_status: "rejected", reason: "Data unit tidak sesuai", property_name: "Menara A", whatsapp_number: "628112222333" } } })]]);
    const err = await httpApi.login("sinta@tenant.test", "x").catch((e: unknown) => e);
    expect(isApiError(err)).toBe(true);
    expect((err as ApiError).problem.meta?.reason).toBe("Data unit tidak sesuai");
    const n = accountStatusNotice(err);
    expect(n?.code).toBe("ACCOUNT_REJECTED");
    expect(n?.reason).toBe("Data unit tidak sesuai");
    expect(n?.whatsapp).toBe("628112222333");
    expect(accountStatusNotice(new ApiError({ type: "", title: "", status: 401, code: "INVALID_CREDENTIALS" }))).toBeNull();
  });

  it("changePassword memakai POST /me/password", async () => {
    const calls = mockFetch([["POST", "/api/v1/me/password", () => ({ status: 204 })]]);
    await httpApi.changePassword("Lama1234", "Baru12345");
    expect(calls[0]).toMatchObject({ method: "POST", body: { current_password: "Lama1234", new_password: "Baru12345" } });
  });

  it("updateMe hanya mengirim field yang diisi (PATCH /tenant/me)", async () => {
    const calls = mockFetch([["PATCH", "/api/v1/tenant/me", () => ({ body: { id: "u1", full_name: "Dewi", phone: "0812" } })]]);
    await httpApi.updateMe({ full_name: "Dewi" });
    expect(calls[0].body).toEqual({ full_name: "Dewi" });
  });

  it("payments per invoice difilter server lewat invoice_id (B-14)", async () => {
    const calls = mockFetch([["GET", "/api/v1/tenant/payments", () => ({ body: { data: [{ id: "p1", invoice_id: "inv-1" }], next_cursor: null } })]]);
    const rows = await httpApi.payments("inv-1");
    expect(rows).toHaveLength(1);
    const u = new URL(calls[0].url, "http://x");
    expect(u.pathname).toBe("/api/v1/tenant/payments");
    expect(u.searchParams.get("invoice_id")).toBe("inv-1");
    await httpApi.payments();
    expect(new URL(calls[1].url, "http://x").searchParams.has("invoice_id")).toBe(false);
  });

  it("registrasi Web Push hanya mengirim platform + subscription {endpoint, keys} (+ app_version) — tanpa app/user_agent", async () => {
    const calls = mockFetch([["POST", "/api/v1/me/devices", () => ({ status: 204 })]]);
    await httpApi.registerDevice({ platform: "web", subscription: { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "BPkey", auth: "authkey" } }, app_version: "0.1.0" });
    expect(calls[0].body).toEqual({ platform: "web", subscription: { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "BPkey", auth: "authkey" } }, app_version: "0.1.0" });
    await httpApi.registerDevice({ platform: "android", token: "fcm:tok-1" });
    expect(calls[1].body).toEqual({ platform: "android", token: "fcm:tok-1" });
  });

  it("hapus perangkat push lewat DELETE /me/devices/{token}?endpoint= (endpoint mengandung '/')", async () => {
    const calls = mockFetch([["DELETE", "/api/v1/me/devices/", () => ({ status: 204 })]]);
    await httpApi.unregisterDevice("https://fcm.googleapis.com/fcm/send/abc");
    const u = new URL(calls[0].url, "http://x");
    expect(u.pathname).toBe("/api/v1/me/devices/device");
    expect(u.searchParams.get("endpoint")).toBe("https://fcm.googleapis.com/fcm/send/abc");
  });

  it("pesan dengan foto: presign object SR → PUT storage → confirm → POST pesan dengan attachment_ids (P3-SRQ-05)", async () => {
    const calls = mockFetch([presignRoute("att-1"), uploadRoute, confirmRoute, ["POST", "/api/v1/tenant/requests/sr-1/messages", (c) => ({ status: 201, body: { id: "m1", author_kind: "tenant", body: (c.body as { body: string }).body, attachment_ids: ["att-1"], attachments: [] } })]]);
    const photo = new Blob(["jpeg-bytes"], { type: "image/jpeg" });
    await httpApi.sendMessage("sr-1", "Ini fotonya", [photo]);
    expect(calls.map((c) => c.method)).toEqual(["POST", "PUT", "POST", "POST"]);
    expect(calls[0].body).toMatchObject({ object_type: "service_request", object_id: "sr-1", attachment_type: "photo", content_type: "image/jpeg", size_bytes: photo.size });
    expect(calls[1].body).toBe(photo);
    expect(calls[3].body).toEqual({ body: "Ini fotonya", attachment_ids: ["att-1"] });
    expect(calls[3].headers["Idempotency-Key"]).toBeTruthy();
  });

  it("bukti transfer PDF diunggah sebagai document pada object payment (P4-TNT-02)", async () => {
    const calls = mockFetch([presignRoute("att-9"), uploadRoute, confirmRoute]);
    await httpApi.uploadPaymentProof("pay-1", new Blob(["%PDF-1.4"], { type: "application/pdf" }), "bukti.pdf");
    expect(calls[0].body).toMatchObject({ object_type: "payment", object_id: "pay-1", attachment_type: "document", content_type: "application/pdf", original_filename: "bukti.pdf" });
  });

  it("tautan dokumen invoice/kwitansi: POST tanpa body; statement dengan rentang tanggal (P4-TNT-03)", async () => {
    const link = { url: "https://app.test/api/v1/public/documents/tok", expires_at: "2026-10-01T00:00:00Z" };
    const calls = mockFetch([
      ["POST", "/document-link", () => ({ body: link })],
      ["GET", "/api/v1/tenant/statement", () => ({ body: { entries: [], closing_balance: 0 } })],
      ["POST", "/api/v1/tenant/statement/link", () => ({ body: link })],
    ]);
    expect((await httpApi.invoiceDocumentLink("inv-1")).url).toBe(link.url);
    await httpApi.receiptDocumentLink("pay-1");
    expect(calls[0]).toMatchObject({ method: "POST", body: undefined });
    expect(calls[0].url).toContain("/api/v1/tenant/invoices/inv-1/document-link");
    expect(calls[1].url).toContain("/api/v1/tenant/payments/pay-1/document-link");
    await httpApi.statement({ from: "2026-04-01", to: "2026-09-28" });
    const su = new URL(calls[2].url, "http://x");
    expect([su.searchParams.get("from"), su.searchParams.get("to")]).toEqual(["2026-04-01", "2026-09-28"]);
    await httpApi.statementLink({ from: "2026-04-01", to: "2026-09-28" });
    expect(calls[3].body).toEqual({ from: "2026-04-01", to: "2026-09-28" });
  });

  it("pengumuman: filter kategori & konfirmasi baca tanpa body (P3-ANN-05/06)", async () => {
    const calls = mockFetch([
      ["GET", "/api/v1/tenant/announcements", () => ({ body: { data: [], next_cursor: null } })],
      ["POST", "/acknowledge", () => ({ body: { id: "an-1", acknowledged_at: "2026-09-28T01:00:00Z" } })],
    ]);
    await httpApi.announcements({ category: "news" });
    expect(new URL(calls[0].url, "http://x").searchParams.get("category")).toBe("news");
    const a = await httpApi.acknowledgeAnnouncement("an-1");
    expect(a.acknowledged_at).toBeTruthy();
    expect(calls[1]).toMatchObject({ method: "POST", body: undefined });
  });

  it("preferensi notifikasi: hanya kanal yang diubah dikirim (server menggabungkan, PUT /notifications/preferences)", async () => {
    const calls = mockFetch([["PUT", "/api/v1/notifications/preferences", () => ({ status: 204 })]]);
    await httpApi.setNotificationPreference({ type: "invoice_issued", push: false });
    expect(calls[0].body).toEqual({ type: "invoice_issued", push: false });
    await httpApi.setNotificationPreference({ type: "invoice_issued", inapp: true, push: false, email: false });
    expect(calls[1].body).toEqual({ type: "invoice_issued", inapp: true, push: false, email: false });
  });

  it("daftar izin parkir GET /tenant/parking-permits (filter status CSV) & detail kendaraan dengan dokumen STNK", async () => {
    const doc = { id: "d1", attachment_type: "photo", file_name: "stnk.jpg", content_type: "image/jpeg", url: "https://storage.test/stnk", thumb_url: "https://storage.test/stnk-t", uploaded_at: "2026-09-01T00:00:00Z" };
    const calls = mockFetch([
      ["GET", "/api/v1/tenant/parking-permits", () => ({ body: { data: [{ id: "pm-2" }, { id: "pm-1" }], next_cursor: null } })],
      ["GET", "/api/v1/tenant/vehicles/veh-1", () => ({ body: { id: "veh-1", plate_number: "B 1 A", is_mine: true, document_count: 1, permits: [], documents: [doc] } })],
    ]);
    const all = await httpApi.parkingPermits();
    expect(all.map((p) => p.id)).toEqual(["pm-2", "pm-1"]);
    expect(new URL(calls[0].url, "http://x").searchParams.has("status")).toBe(false);
    await httpApi.parkingPermits({ status: ["requested", "approved"] });
    expect(new URL(calls[1].url, "http://x").searchParams.get("status")).toBe("requested,approved");
    const v = await httpApi.vehicle("veh-1");
    expect(calls[2]).toMatchObject({ method: "GET" });
    expect(new URL(calls[2].url, "http://x").pathname).toBe("/api/v1/tenant/vehicles/veh-1");
    expect(v.documents?.[0]).toEqual(doc);
  });

  it("pesan foto saja: body kosong + attachment_ids (server menerima body kosong bila ada lampiran)", async () => {
    const calls = mockFetch([presignRoute("att-7"), uploadRoute, confirmRoute, ["POST", "/api/v1/tenant/requests/sr-1/messages", () => ({ status: 201, body: { id: "m2", author_kind: "tenant", body: "", attachment_ids: ["att-7"], attachments: [] } })]]);
    const m = await httpApi.sendMessage("sr-1", "", [new Blob(["jpeg"], { type: "image/jpeg" })]);
    expect(calls[3].body).toEqual({ body: "", attachment_ids: ["att-7"] });
    expect(m.body).toBe("");
  });

  it("PATCH /tenant/me dengan phone kosong mengosongkan nomor", async () => {
    const calls = mockFetch([["PATCH", "/api/v1/tenant/me", () => ({ body: { id: "u1", full_name: "Dewi", phone: null } })]]);
    const me = await httpApi.updateMe({ full_name: "Dewi", phone: "  " });
    expect(calls[0].body).toEqual({ full_name: "Dewi", phone: "" });
    expect(me.phone).toBeNull();
  });

  it("403 PASSWORD_CHANGE_REQUIRED memanggil handler global lalu tetap dilempar sebagai ApiError", async () => {
    const handler = vi.fn();
    setPasswordChangeRequiredHandler(handler);
    try {
      mockFetch([
        ["POST", "/api/v1/me/devices", () => ({ status: 403, body: { type: "x", title: "Password change required", status: 403, code: "PASSWORD_CHANGE_REQUIRED", detail: "Ganti password sementara" } })],
        ["GET", "/api/v1/tenant/invoices", () => ({ status: 403, body: { type: "x", title: "Forbidden", status: 403, code: "FORBIDDEN" } })],
      ]);
      const err = await httpApi.registerDevice({ platform: "web", subscription: { endpoint: "https://push.test/e", keys: { p256dh: "k", auth: "a" } } }).catch((e: unknown) => e);
      expect(isPasswordChangeRequired(err)).toBe(true);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(errorMessage(err)).toMatch(/password baru/i);
      // 403 lain tidak memicu handler
      await http("tenant/invoices").catch(() => {});
      expect(handler).toHaveBeenCalledTimes(1);
    } finally {
      setPasswordChangeRequiredHandler(() => {});
    }
  });

  it("paket menunggu/riwayat & izin parkir (P3-PKG-02, P3-PRK-02)", async () => {
    const calls = mockFetch([
      ["GET", "/api/v1/tenant/packages", () => ({ body: { data: [], next_cursor: null } })],
      ["POST", /parking-permits\/pm-1\/cancel$/, () => ({ body: { id: "pm-1", status: "cancelled" } })],
      ["POST", "/api/v1/tenant/parking-permits", (c) => ({ status: 201, body: { id: "pm-1", ...(c.body as object) } })],
    ]);
    await httpApi.packages({ waiting: true });
    await httpApi.packages({ waiting: false });
    expect(new URL(calls[0].url, "http://x").searchParams.get("waiting")).toBe("true");
    expect(new URL(calls[1].url, "http://x").searchParams.get("waiting")).toBe("false");
    await httpApi.requestPermit({ vehicle_id: "v1", permit_type: "monthly", parking_area_id: "", valid_from: "2026-10-01", notes: "  " });
    expect(calls[2].body).toEqual({ vehicle_id: "v1", permit_type: "monthly", parking_area_id: null, valid_from: "2026-10-01", notes: null });
    await httpApi.cancelPermit("pm-1");
    expect(calls[3]).toMatchObject({ method: "POST", body: undefined });
  });

  it("kendaraan baru + STNK: presign object vehicle setelah kendaraan dibuat (P3-PRK-01)", async () => {
    const calls = mockFetch([["POST", "/api/v1/tenant/vehicles", () => ({ status: 201, body: { id: "veh-1", plate_number: "B 1234 XYZ", document_count: 0, permits: [] } })], presignRoute("att-3"), uploadRoute, confirmRoute]);
    const v = await httpApi.createVehicle({ plate_number: " B 1234 XYZ ", vehicle_type: "car", brand: "Toyota", color: "Hitam", unit_id: null }, new Blob(["x"], { type: "image/jpeg" }));
    expect(calls[0].body).toEqual({ plate_number: "B 1234 XYZ", vehicle_type: "car", brand: "Toyota", color: "Hitam" });
    expect(calls[1].body).toMatchObject({ object_type: "vehicle", object_id: "veh-1" });
    expect(v.document_count).toBe(1);
  });

  it("feedback umum + foto: object tenant_feedback lalu muat ulang detail (P3-FDB-02)", async () => {
    const calls = mockFetch([
      ["POST", "/api/v1/tenant/feedback", () => ({ status: 201, body: { id: "fb-1", photos: [] } })],
      presignRoute("att-4"),
      uploadRoute,
      confirmRoute,
      ["GET", "/api/v1/tenant/feedback/fb-1", () => ({ body: { id: "fb-1", photos: [{ id: "att-4", url: "https://storage.test/get" }] } })],
    ]);
    const fb = await httpApi.createFeedback({ category: "suggestion", subject: " Taman ", body: "Tambah bangku", is_anonymous: true }, [new Blob(["x"], { type: "image/jpeg" })]);
    expect(calls[0].body).toEqual({ category: "suggestion", subject: "Taman", body: "Tambah bangku", is_anonymous: true, unit_id: null });
    expect(calls[1].body).toMatchObject({ object_type: "tenant_feedback", object_id: "fb-1" });
    expect(fb.photos).toHaveLength(1);
  });

  it("anggota tenant: buat (password sementara) & nonaktifkan tanpa body (P3-ACC-08)", async () => {
    const calls = mockFetch([
      ["POST", /\/api\/v1\/tenant\/members$/, () => ({ status: 201, body: { member: { tenant_user_id: "tu-9" }, temporary_password: "Bvtemp123!" } })],
      ["POST", "/deactivate", () => ({ body: { tenant_user_id: "tu-9", status: "suspended" } })],
      ["PUT", "/units", (c) => ({ body: { tenant_user_id: "tu-9", units: c.body } })],
    ]);
    const c = await httpApi.createMember({ full_name: "Staf Dewi", email: "staf@tenant.test", phone: "", unit_ids: ["u1"] });
    expect(c.temporary_password).toBe("Bvtemp123!");
    expect(calls[0].body).toEqual({ full_name: "Staf Dewi", email: "staf@tenant.test", unit_ids: ["u1"] });
    await httpApi.deactivateMember("tu-9");
    expect(calls[1]).toMatchObject({ method: "POST", body: undefined });
    await httpApi.setMemberUnits("tu-9", ["u1", "u2"]);
    expect(calls[2].body).toEqual({ unit_ids: ["u1", "u2"] });
  });

  it("unit saya: daftar & detail (P3-UNT-01..04)", async () => {
    const calls = mockFetch([
      ["GET", /\/api\/v1\/tenant\/units$/, () => ({ body: { data: [{ unit: { id: "u1" }, counts: { open_requests: 2 } }], next_cursor: null } })],
      ["GET", "/api/v1/tenant/units/u1", () => ({ body: { unit: { id: "u1" }, counts: { open_requests: 2 } } })],
    ]);
    expect((await httpApi.myUnits())[0].counts.open_requests).toBe(2);
    expect((await httpApi.myUnit("u1")).unit.id).toBe("u1");
    expect(calls).toHaveLength(2);
  });
});
