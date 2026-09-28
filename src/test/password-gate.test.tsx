// Password sementara ditegakkan server (403 PASSWORD_CHANGE_REQUIRED, P3-ACC-03): sesi diarahkan ke Buat Password Baru, push
// (POST /me/devices) tidak didaftarkan sebelum password diganti, dan dijalankan setelahnya.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { setApi, type TenantApi } from "@/api";
import { mockApi, resetMock } from "@/api/mock/api";
import { AuthProvider } from "@/app/auth";
import { routes } from "@/app/routes";
import { ToastProvider } from "@/components/ui/toast";
import { saveJSON } from "@/lib/storage";

const { syncPush } = vi.hoisted(() => ({ syncPush: vi.fn(async () => {}) }));
vi.mock("@/lib/push", async (orig) => ({ ...(await orig<typeof import("@/lib/push")>()), syncPush }));

beforeAll(async () => {
  Element.prototype.scrollIntoView = vi.fn();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as typeof window.matchMedia;
  await Promise.all([import("@/features/account/ChangePasswordPage"), import("@/features/bills/BillsPage"), import("@/features/home/HomePage")]);
}, 180_000);

beforeEach(() => {
  localStorage.clear();
  resetMock();
  setApi(mockApi);
  syncPush.mockClear();
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

describe("password sementara (PASSWORD_CHANGE_REQUIRED)", () => {
  it("akun berpassword sementara diarahkan ke Buat Password Baru; push baru disinkronkan setelah password diganti", async () => {
    await mockApi.login("sementara@demo.buildingvision.id", "Sementara123");
    saveJSON("user", await mockApi.me());
    const router = renderRoute("/bills");
    expect(await screen.findByText("Buat Password Baru", {}, T)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/account/password");
    expect(syncPush).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Password sementara"), { target: { value: "Sementara123" } });
    fireEvent.change(screen.getByLabelText("Password baru"), { target: { value: "Baru12345" } });
    fireEvent.change(screen.getByLabelText("Konfirmasi password baru"), { target: { value: "Baru12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/bills"), T);
    await waitFor(() => expect(syncPush).toHaveBeenCalledTimes(1));
  }, 30_000);

  it("403 PASSWORD_CHANGE_REQUIRED dari endpoint mana pun mengarahkan sesi ke Buat Password Baru (flag lokal usang)", async () => {
    await mockApi.login("sementara@demo.buildingvision.id", "Sementara123");
    // /tenant/me tidak membawa flag (mis. cache lama) → server tetap menolak endpoint lain
    const stale: TenantApi = { ...mockApi, me: async () => ({ ...(await mockApi.me()), must_change_password: false }) };
    setApi(stale);
    saveJSON("user", await stale.me());
    const router = renderRoute("/bills");
    expect(await screen.findByText("Buat Password Baru", {}, T)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/account/password");
  }, 30_000);
});
