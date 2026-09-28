import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import "./styles/theme.css";
import { router } from "./app/router";
import { AuthProvider } from "./app/auth";
import { ToastProvider } from "./components/ui/toast";
import { PwaUpdatePrompt } from "./app/pwa-update";
import { initNative } from "./lib/native";
import { initPushHandlers } from "./lib/push";
import { resolveDeepLink } from "./lib/deep-link";
import { api } from "./api";
import { TAB_ROOTS } from "./components/ui/shell";
import { isPasswordChangeRequired } from "./lib/http";

const queryClient = new QueryClient({
  defaultOptions: {
    // 403 PASSWORD_CHANGE_REQUIRED tidak diulang: sesi diarahkan ke Buat Password Baru (handler global lib/http)
    queries: { staleTime: 30_000, retry: (n, e) => n < 1 && !isPasswordChangeRequired(e), refetchOnWindowFocus: true },
  },
});

// Tombol back Android (Capacitor): mundur bila ada riwayat; di root tab (D-P3-01) / layar publik keluar app.
const ROOTS = ["/welcome", "/login", ...TAB_ROOTS];
initNative(() => {
  const path = router.state.location.pathname;
  if (ROOTS.includes(path) || window.history.length <= 1) return false;
  router.navigate(-1);
  return true;
});

// Push (Web Push SW / FCM native): tap → buka deep link yang tervalidasi (B-01) & tandai dibaca; push masuk → segarkan badge.
const refreshInbox = () => {
  void queryClient.invalidateQueries({ queryKey: ["unread"] });
  void queryClient.invalidateQueries({ queryKey: ["notifications"] });
};
initPushHandlers({
  onOpen(link, notificationId) {
    void router.navigate(resolveDeepLink(link));
    if (notificationId) void api().markRead(notificationId).catch(() => {}).finally(refreshInbox);
  },
  onReceive: refreshInbox,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <PwaUpdatePrompt />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
