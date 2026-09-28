// Test komponen utama PRD P3 v2.1 (P3-NFR-07): status akun di login (B-08), wajib ganti password (P3-ACC-03), konfirmasi
// pengumuman (P3-ANN-05), lampiran pesan (P3-SRQ-05), tab navigasi (D-P3-01).
import type { ReactNode } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setApi } from "@/api";
import { mockApi, resetMock } from "@/api/mock/api";
import { AuthProvider } from "@/app/auth";
import { RequireAuth } from "@/app/routes";
import { ToastProvider } from "@/components/ui/toast";
import { BottomNav } from "@/components/ui/shell";
import LoginPage from "@/features/auth/LoginPage";
import AnnouncementPage from "@/features/inbox/AnnouncementPage";
import RequestDetailPage from "@/features/requests/RequestDetailPage";
import { ApiError } from "@/lib/http";
import { saveJSON } from "@/lib/storage";

function renderAt(path: string, routes: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>{routes}</Routes>
          </MemoryRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

async function loginAs(email: string, password: string) {
  await mockApi.login(email, password);
  saveJSON("user", await mockApi.me());
}

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn(); // tidak ada di jsdom
});

beforeEach(() => {
  localStorage.clear();
  resetMock();
  setApi(mockApi);
});

describe("komponen Tenant App (PRD P3 v2.1)", () => {
  it("login akun ditolak menampilkan status, alasan, dan tombol WhatsApp pengelola (B-08)", async () => {
    setApi({
      ...mockApi,
      login: vi.fn(async () => {
        throw new ApiError({ type: "", title: "Account rejected", status: 403, code: "ACCOUNT_REJECTED", detail: "Pendaftaran akun ditolak", meta: { account_status: "rejected", reason: "Data unit tidak sesuai", property_name: "Menara A", whatsapp_number: "628112222333" } });
      }),
    });
    renderAt("/login", <Route path="/login" element={<LoginPage />} />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "sinta@tenant.test" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Tenant12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByText("Pendaftaran akun ditolak")).toBeInTheDocument();
    expect(screen.getByText(/Data unit tidak sesuai/)).toBeInTheDocument();
    const wa = screen.getByRole("link", { name: /Hubungi pengelola via WhatsApp/ });
    expect(wa.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/628112222333\?text=.*sinta%40tenant\.test/);
  });

  it("akun dengan password sementara diarahkan ke Ganti Password (P3-ACC-03)", async () => {
    await loginAs("sementara@demo.buildingvision.id", "Sementara123");
    renderAt(
      "/",
      <>
        <Route path="/" element={<RequireAuth><div>Beranda</div></RequireAuth>} />
        <Route path="/account/password" element={<div>Halaman ganti password</div>} />
      </>,
    );
    expect(await screen.findByText("Halaman ganti password")).toBeInTheDocument();
    expect(screen.queryByText("Beranda")).not.toBeInTheDocument();
  });

  it("pengumuman requires_ack dapat dikonfirmasi (P3-ANN-05)", async () => {
    await loginAs("yosep@demo.buildingvision.id", "Demo12345!");
    renderAt("/inbox/announcements/an-3", <Route path="/inbox/announcements/:id" element={<AnnouncementPage />} />);
    expect(await screen.findByText("Pemadaman listrik terencana Tower Pinus")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Saya sudah membaca/ }));
    expect(await screen.findByText(/Anda sudah mengonfirmasi/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Saya sudah membaca/ })).not.toBeInTheDocument();
  });

  it("thread pesan menampilkan lampiran foto & tombol lampirkan (P3-SRQ-05)", async () => {
    await loginAs("yosep@demo.buildingvision.id", "Demo12345!");
    setApi({
      ...mockApi,
      messages: vi.fn(async () => [{ id: "m1", author_kind: "staff" as const, author_name: "Building Management", body: "Mohon cek foto ini", attachment_ids: ["a1"], attachments: [{ id: "a1", content_type: "image/jpeg", file_name: "foto-lampu.jpg", url: "https://storage.test/a1.jpg" }], created_at: new Date().toISOString(), read_at: null }]),
    });
    renderAt("/requests/sr-1003?messages=1", <Route path="/requests/:id" element={<RequestDetailPage />} />);
    const img = await screen.findByAltText("foto-lampu.jpg");
    expect(img).toHaveAttribute("src", "https://storage.test/a1.jpg");
    expect(screen.getByRole("button", { name: "Lampirkan foto" })).toBeInTheDocument();
  });

  it("tab bawah mengikuti D-P3-01: Home · Requests · Bills · Facilities · Akun", async () => {
    await loginAs("yosep@demo.buildingvision.id", "Demo12345!");
    renderAt("/", <Route path="*" element={<BottomNav />} />);
    const labels = (await screen.findAllByRole("link")).map((a) => a.textContent);
    expect(labels).toEqual(["Home", "Requests", "Bills", "Facilities", "Akun"]);
  });
});
