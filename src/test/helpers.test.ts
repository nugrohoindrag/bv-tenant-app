// Test helper murni fitur PRD P3/P4 v2.1: WhatsApp, pengelompokan preferensi, aturan tampilan pembayaran/izin/statement.
import { describe, expect, it } from "vitest";
import type { NotificationPreference, Option, Vehicle } from "@/api/types";
import { normalizeWhatsApp, resolvePublicContacts, waLink } from "@/lib/whatsapp";
import { ApiError } from "@/lib/http";
import { announcementTone, groupPreferences, notifTypeLabel } from "@/lib/labels";
import { pickActiveUnit } from "@/lib/active-unit";
import { canDownloadReceipt, canUploadProof, receiptErrorMessage } from "@/features/bills/BillDetailPage";
import { balanceLabel, presetRange } from "@/features/bills/StatementPage";
import { canRequestPermit, permitValidity } from "@/features/parking/ParkingPage";
import { normalizePlate } from "@/features/parking/VehicleFormPage";
import { passwordProblem } from "@/features/account/ChangePasswordPage";
import { validateProfile } from "@/features/account/EditProfilePage";

describe("WhatsApp click-to-chat (P3-WAM-04/05)", () => {
  it("normalisasi nomor ke 62…", () => {
    expect(normalizeWhatsApp("0811-2222-333")).toBe("628112222333");
    expect(normalizeWhatsApp("+62 812 3456 7890")).toBe("6281234567890");
    expect(normalizeWhatsApp("81234567890")).toBe("6281234567890");
    expect(normalizeWhatsApp("123")).toBeNull();
    expect(normalizeWhatsApp(null)).toBeNull();
  });
  it("tautan wa.me dengan teks ter-encode", () => {
    expect(waLink("08112222333", "Halo pengelola & staf")).toBe("https://wa.me/628112222333?text=Halo%20pengelola%20%26%20staf");
    expect(waLink("", "x")).toBeNull();
  });
});

describe("preferensi notifikasi (P3-ACC-09)", () => {
  const p = (type: string, category?: string): NotificationPreference => ({ type, inapp: true, push: true, email: false, category });
  it("dikelompokkan per category dengan urutan tetap; kategori asing → Lainnya", () => {
    const g = groupPreferences([p("invoice_issued", "billing"), p("ticket_status", "request"), p("x_custom", "weird"), p("package_received", "package")]);
    expect(g.map((x) => x.category)).toEqual(["request", "billing", "package", "other"]);
    expect(g[0].label).toBe("Permintaan");
  });
  it("label tipe notifikasi berbahasa Indonesia dengan fallback", () => {
    expect(notifTypeLabel("parking_permit_expiring")).toBe("Izin parkir segera berakhir");
    expect(notifTypeLabel("some_new_type")).toBe("Some new type");
  });
});

describe("pengumuman: kategori & severity menggantikan importance 'urgent'", () => {
  it("alert/critical ditonjolkan", () => {
    expect(announcementTone({ category: "alert", severity: "info" })).toBe("warning");
    expect(announcementTone({ category: "announcement", severity: "critical" })).toBe("critical");
    expect(announcementTone({ category: "news", severity: "info" })).toBe("info");
  });
});

describe("unit aktif (P3-UNT-04)", () => {
  const u = (id: string, primary = false) => ({ id, access_id: "a" + id, location_type: "unit", name: id, code: id, path_text: id, is_primary: primary });
  it("pilihan tersimpan → unit utama → unit pertama", () => {
    const user = { units: [u("a"), u("b", true)], primary_unit: u("b", true) };
    expect(pickActiveUnit(user, "a")?.id).toBe("a");
    expect(pickActiveUnit(user, "hilang")?.id).toBe("b");
    expect(pickActiveUnit({ units: [u("c")], primary_unit: null }, null)?.id).toBe("c");
    expect(pickActiveUnit(null, null)).toBeNull();
  });
});

describe("pembayaran: bukti transfer & kwitansi (P4-TNT-02/03)", () => {
  it("unggah bukti: murni allowed_actions server (upload_proof hanya untuk pemilik pembayaran manual yang menunggu)", () => {
    expect(canUploadProof({ allowed_actions: ["view", "upload_proof"] })).toBe(true);
    expect(canUploadProof({ allowed_actions: ["view"] })).toBe(false); // bukan pemilik / bukan manual pending
    expect(canUploadProof({})).toBe(false);
  });
  it("kwitansi hanya bila server mengizinkan; 409 RECEIPT_NOT_AVAILABLE diberi pesan ramah", () => {
    expect(canDownloadReceipt({ allowed_actions: ["view", "download_receipt"] })).toBe(true);
    expect(canDownloadReceipt({ allowed_actions: ["view"] })).toBe(false);
    expect(canDownloadReceipt({})).toBe(false);
    expect(receiptErrorMessage(new ApiError({ type: "", title: "", status: 409, code: "RECEIPT_NOT_AVAILABLE", detail: "x" }))).toMatch(/Kwitansi belum tersedia/);
  });
});

describe("kontak pengelola di layar publik (P3-COM-02, perangkat baru)", () => {
  const empty = { whatsapp_number: null, property_name: null };
  const props: Option[] = [
    { id: "p1", name: "Menara A", whatsapp_number: "628112222333" },
    { id: "p2", name: "Menara B", whatsapp_number: "628119999000" },
    { id: "p3", name: "Menara C" },
  ];
  it("property yang disebut meta login → nomornya", () => {
    expect(resolvePublicContacts(empty, props, "menara b").primary).toEqual({ property_name: "Menara B", whatsapp_number: "628119999000" });
  });
  it("cache perangkat didahulukan bila property tidak diketahui", () => {
    expect(resolvePublicContacts({ whatsapp_number: "0811 1111 222", property_name: "Menara A" }, props).primary?.whatsapp_number).toBe("628111111222");
  });
  it("perangkat baru: satu nomor → tombol tunggal; beberapa nomor → pilihan per property; tanpa nomor → null", () => {
    expect(resolvePublicContacts(empty, [props[0]!, props[2]!]).primary).toEqual({ property_name: "Menara A", whatsapp_number: "628112222333" });
    const many = resolvePublicContacts(empty, props);
    expect(many.primary).toBeNull();
    expect(many.options.map((o) => o.property_name)).toEqual(["Menara A", "Menara B"]);
    expect(resolvePublicContacts(empty, [props[2]!])).toEqual({ primary: null, options: [] });
  });
});

describe("statement (P4-OUT-02)", () => {
  it("preset rentang tanggal lokal", () => {
    const today = new Date(2026, 8, 28);
    expect(presetRange("6", today)).toEqual({ from: "2026-03-28", to: "2026-09-28" });
    expect(presetRange("ytd", today)).toEqual({ from: "2026-01-01", to: "2026-09-28" });
  });
  it("label saldo: terutang / kelebihan bayar / lunas", () => {
    expect(balanceLabel(150000)).toBe("Rp 150.000 terutang");
    expect(balanceLabel(-50000)).toBe("Rp 50.000 kelebihan bayar");
    expect(balanceLabel(0)).toBe("Lunas (Rp 0)");
  });
});

describe("parkir (P3-PRK-01/02)", () => {
  const permit = (o: Partial<Vehicle["permits"][number]>) => ({ id: "p", permit_number: "PRK-1", status: "approved", is_active: true, valid_from: "2026-01-01", valid_until: "2026-12-31", requested_at: "2026-01-01T00:00:00Z", ...o }) as Vehicle["permits"][number];
  const veh = (permits: Vehicle["permits"]) => ({ id: "v", permits }) as Vehicle;
  it("pengajuan izin hanya bila tidak ada izin aktif / permohonan berjalan", () => {
    expect(canRequestPermit(veh([]))).toBe(true);
    expect(canRequestPermit(veh([permit({})]))).toBe(false);
    expect(canRequestPermit(veh([permit({ status: "requested", is_active: false })]))).toBe(false);
    expect(canRequestPermit(veh([permit({ status: "expired", is_active: false }), permit({ status: "rejected", is_active: false })]))).toBe(true);
  });
  it("teks masa berlaku izin", () => {
    expect(permitValidity({ valid_from: null, valid_until: null })).toBe("Masa berlaku ditentukan pengelola");
    expect(permitValidity({ valid_from: "2026-10-01", valid_until: null })).toBe("Mulai 1 Oktober 2026");
  });
  it("plat dinormalisasi huruf besar & spasi tunggal", () => {
    expect(normalizePlate("b  1234-xyz")).toBe("B 1234XYZ");
  });
});

describe("validasi akun", () => {
  it("password baru: panjang, huruf+angka, konfirmasi, beda dari lama", () => {
    expect(passwordProblem("abc", "abc")).toMatch(/minimal 8/);
    expect(passwordProblem("Rahasia123", "Rahasia124")).toMatch(/Konfirmasi/);
    expect(passwordProblem("Rahasia123", "Rahasia123", "Rahasia123")).toMatch(/berbeda/);
    expect(passwordProblem("Rahasia123", "Rahasia123", "Lama12345")).toBeNull();
  });
  it("profil: nama wajib, telepon 8–15 digit bila diisi", () => {
    expect(validateProfile(" ", "")).toHaveProperty("full_name");
    expect(validateProfile("Dewi", "0812")).toHaveProperty("phone");
    expect(validateProfile("Dewi", "")).toEqual({});
    expect(validateProfile("Dewi", "0812-3456-7890")).toEqual({});
  });
});
