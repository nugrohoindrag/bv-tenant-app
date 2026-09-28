// B-01 (P3-INB-02): setiap deep link notifikasi tenant dari server (notification/tenant.go renderTenant) harus membuka route
// yang ada di PWA; path lama dipetakan dan path asing jatuh ke Inbox.
import { describe, expect, it } from "vitest";
import { isAppRoute, resolveDeepLink } from "@/lib/deep-link";

const ID = "0192f7a0-1111-7abc-8def-123456789abc";
const PAY = "0192f7a0-2222-7abc-8def-123456789abc";

// Pola deep link yang dirender backend untuk akun tenant
const SERVER_LINKS = [
  `/requests/${ID}`,
  "/account",
  `/inbox/announcements/${ID}`,
  `/facilities/bookings/${ID}`,
  `/visitors/${ID}`,
  `/bills/${ID}`,
  `/bills/${ID}?payment=${PAY}`,
  "/bills",
  `/packages/${ID}`,
  `/parking/permits/${ID}`,
  "/parking",
  `/feedback/${ID}`,
  "/",
];

describe("deep link notifikasi tenant", () => {
  it.each(SERVER_LINKS)("%s membuka route yang ada", (link) => {
    expect(resolveDeepLink(link)).toBe(link);
  });

  it("route halaman baru P3 terdaftar", () => {
    for (const p of ["/units", `/units/${ID}`, "/packages", "/feedback", "/feedback/new", "/parking/vehicles/new", "/parking/permits/new", "/account/notifications", "/account/members", "/account/profile", "/bills/statement"]) {
      expect(isAppRoute(p), p).toBe(true);
    }
  });

  it("path lama dipetakan (B-01: /profile, /home)", () => {
    expect(resolveDeepLink("/profile")).toBe("/account");
    expect(resolveDeepLink("/home")).toBe("/");
    expect(resolveDeepLink("/account/")).toBe("/account");
  });

  it("URL absolut diambil path-nya; path asing/berbahaya → Inbox", () => {
    expect(resolveDeepLink(`https://tenant.buildingvision.web.id/requests/${ID}`)).toBe(`/requests/${ID}`);
    expect(resolveDeepLink("/tidak-ada/sama-sekali")).toBe("/inbox");
    expect(resolveDeepLink("//evil.example/requests/1")).toBe("/inbox");
    expect(resolveDeepLink("javascript:alert(1)")).toBe("/inbox");
    expect(resolveDeepLink("")).toBe("/inbox");
    expect(resolveDeepLink(null)).toBe("/inbox");
  });
});
