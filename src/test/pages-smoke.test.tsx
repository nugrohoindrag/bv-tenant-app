// Smoke test halaman PRD P3/P4 v2.1 lewat tabel route asli (guard, lazy) + adapter mock: setiap layar baru/berubah tampil
// dengan data demo tanpa error runtime (loading → data).
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { setApi } from "@/api";
import { mockApi, resetMock } from "@/api/mock/api";
import { AuthProvider } from "@/app/auth";
import { routes } from "@/app/routes";
import { ToastProvider } from "@/components/ui/toast";
import { saveJSON } from "@/lib/storage";

beforeAll(async () => {
  Element.prototype.scrollIntoView = vi.fn();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as typeof window.matchMedia;
  // muat modul halaman lazy lebih dulu: transform dingin di mesin lambat/paralel bisa melebihi batas waktu satu test
  await Promise.all([
    import("@/features/home/HomePage"),
    import("@/features/account/AccountPage"),
    import("@/features/account/EditProfilePage"),
    import("@/features/account/NotificationSettingsPage"),
    import("@/features/account/MembersPage"),
    import("@/features/units/UnitsPage"),
    import("@/features/units/UnitDetailPage"),
    import("@/features/packages/PackagesPage"),
    import("@/features/packages/PackageDetailPage"),
    import("@/features/parking/ParkingPage"),
    import("@/features/parking/VehicleFormPage"),
    import("@/features/parking/VehicleDetailPage"),
    import("@/features/requests/RequestDetailPage"),
    import("@/features/parking/PermitRequestPage"),
    import("@/features/parking/PermitDetailPage"),
    import("@/features/feedback/FeedbackListPage"),
    import("@/features/feedback/NewFeedbackPage"),
    import("@/features/feedback/FeedbackDetailPage"),
    import("@/features/bills/BillsPage"),
    import("@/features/bills/BillDetailPage"),
    import("@/features/bills/StatementPage"),
    import("@/features/inbox/InboxPage"),
    import("@/features/visitors/VisitorsPage"),
  ]);
}, 180_000);

beforeEach(async () => {
  localStorage.clear();
  resetMock();
  setApi(mockApi);
  await mockApi.login("yosep@demo.buildingvision.id", "Demo12345!");
  saveJSON("user", await mockApi.me());
  saveJSON("onboarded", true);
});

function renderRoute(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return router;
}

const T = { timeout: 15_000 };

describe("halaman Tenant App (mock)", () => {
  it.each([
    ["/", "Unit APP 102"],
    ["/account", "Masukan untuk pengelola"],
    ["/account/profile", "Ubah Profil"],
    ["/account/notifications", "Tagihan & Pembayaran"],
    ["/account/members", "Maria Pratama"],
    ["/units", "Unit APP 1001"],
    ["/units/fl-pinus-1-u2", "Paket menunggu"],
    ["/packages", "Kotak sedang, elektronik"],
    ["/packages/pkg-1", "Lokasi pengambilan"],
    ["/parking", "B 4321 ABC"],
    ["/parking/vehicles/veh-1", "stnk-b1234xyz.jpg"],
    ["/parking/vehicles/veh-1/edit", "Plat tidak dapat diubah"],
    ["/parking/vehicles/new", "Daftarkan Kendaraan"],
    ["/parking/permits/pmt-1", "STK-0451"],
    ["/parking/permits/new", "Tidak ada kendaraan yang dapat diajukan"],
    ["/feedback", "Tempat duduk taman"],
    ["/feedback/new", "Kirim Masukan"],
    ["/feedback/fb-1", "Dua bangku taman akan dipasang minggu depan."],
    ["/bills", "Statement tagihan"],
    ["/bills/inv-1", "Unduh invoice PDF"],
    ["/bills/statement", "Saldo akhir"],
    ["/inbox?tab=announcements", "Pemadaman listrik terencana Tower Pinus"],
    ["/visitors", "Rina Kartika"],
  ])(
    "%s tampil",
    async (path, text) => {
      renderRoute(path);
      expect((await screen.findAllByText(text, { exact: false }, T)).length).toBeGreaterThan(0);
    },
    20_000,
  );

  it("detail kendaraan: dokumen STNK tampil sebagai thumbnail yang membuka url (GET /tenant/vehicles/{id})", async () => {
    renderRoute("/parking/vehicles/veh-1");
    const img = await screen.findByAltText("stnk-b1234xyz.jpg", {}, T);
    expect(img.getAttribute("src")).toContain("data:image/svg+xml");
    expect(img.closest("a")?.getAttribute("target")).toBe("_blank");
    expect(screen.getByText("PRK-2026-000012", { exact: false })).toBeInTheDocument();
  }, 20_000);

  it("pesan foto tanpa teks tampil sebagai gelembung lampiran tanpa baris teks kosong (P3-SRQ-05)", async () => {
    await mockApi.sendMessage("sr-1003", "", [new Blob(["x"], { type: "image/jpeg" })]);
    renderRoute("/requests/sr-1003?messages=1");
    const img = await screen.findByAltText("Lampiran", {}, T);
    const bubble = img.closest("div.rounded-2xl") as HTMLElement;
    expect(bubble).toBeTruthy();
    expect(bubble.querySelector(".whitespace-pre-line")).toBeNull();
    expect(within(bubble).queryByText("Foto terlampir")).toBeNull();
    expect(screen.getAllByText("Mohon konfirmasi titik lampu", { exact: false }).length).toBeGreaterThan(0);
  }, 20_000);

  it("deep link lama /profile diarahkan ke Akun (B-01)", async () => {
    const router = renderRoute("/profile");
    expect(await screen.findByText("Masukan untuk pengelola", {}, T)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/account");
  }, 20_000);
});
