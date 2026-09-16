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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
  },
});

// Tombol back Android (Capacitor): mundur bila ada riwayat; di root keluar app.
const ROOTS = ["/", "/welcome", "/login", "/requests", "/facilities", "/visitors", "/bills"];
initNative(() => {
  const path = router.state.location.pathname;
  if (ROOTS.includes(path) || window.history.length <= 1) return false;
  router.navigate(-1);
  return true;
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
