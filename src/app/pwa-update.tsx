// Prompt pembaruan service worker (registerType: prompt) + indikator offline.
import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNative } from "@/lib/native";

export function PwaUpdatePrompt() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <>
      {!online && (
        <div className="fixed left-1/2 top-[calc(var(--safe-top)+8px)] z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-white shadow-float">
          <WifiOff size={14} /> Offline, data terakhir ditampilkan
        </div>
      )}
      {!isNative && <UpdatePrompt />}
    </>
  );
}

function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });
  return (
    <>
      {needRefresh && (
        <div className="fixed inset-x-4 bottom-[calc(var(--safe-bottom)+80px)] z-[60] mx-auto max-w-[448px] rounded-xl bg-card p-3 shadow-float ring-1 ring-border fade-up">
          <div className="flex items-center gap-3">
            <RefreshCw className="text-brand-600" size={20} />
            <div className="flex-1 text-sm">
              <div className="font-bold">Versi baru tersedia</div>
              <div className="text-muted-foreground">Muat ulang untuk memperbarui aplikasi.</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
              Nanti
            </Button>
            <Button size="sm" onClick={() => updateServiceWorker(true)}>
              Perbarui
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
