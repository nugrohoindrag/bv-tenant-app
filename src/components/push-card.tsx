// Ajakan & pengaturan push (P3-PSH-01/02): banner first-run di Home (tidak memaksa; dapat ditutup) dan kartu status di Akun /
// Preferensi notifikasi. Izin browser/OS hanya diminta setelah pengguna menekan "Aktifkan".
import { useState } from "react";
import { BellRing, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { dismissPushBanner, pushBannerDismissed, usePush } from "@/lib/push";

export function PushBanner({ className }: { className?: string }) {
  const toast = useToast();
  const push = usePush();
  const [hidden, setHidden] = useState(() => pushBannerDismissed());
  if (hidden || push.enabled || push.support === "unsupported" || push.permission === "denied") return null;
  const close = () => {
    dismissPushBanner();
    setHidden(true);
  };
  return (
    <section className={className}>
      <div className="relative flex items-start gap-3 rounded-2xl bg-card p-4 shadow-card ring-1 ring-brand-100">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <BellRing size={20} />
        </span>
        <div className="min-w-0 flex-1 pr-5">
          <div className="text-[14px] font-bold">Aktifkan notifikasi</div>
          <p className="mt-0.5 text-[12px] text-neutral-600">Dapatkan kabar saat permintaan diproses, tagihan terbit, atau paket tiba — walau aplikasi tertutup.</p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              loading={push.busy}
              onClick={async () => {
                if (await push.enable()) {
                  toast.success("Notifikasi diaktifkan.");
                  close();
                }
              }}
            >
              Aktifkan
            </Button>
            <Button size="sm" variant="ghost" onClick={close}>
              Nanti
            </Button>
          </div>
          {push.error && <p className="mt-2 text-[12px] text-critical">{push.error}</p>}
        </div>
        <button type="button" aria-label="Tutup" onClick={close} className="absolute right-2 top-2 rounded-full p-1 text-neutral-400">
          <X size={16} />
        </button>
      </div>
    </section>
  );
}

/** Status & tombol push di perangkat ini (Akun, Preferensi notifikasi). */
export function PushSettingsCard({ className }: { className?: string }) {
  const toast = useToast();
  const push = usePush();
  let status: string;
  if (push.support === "unsupported")
    status = push.nativeUnconfigured
      ? "Notifikasi push belum tersedia di versi aplikasi ini. Notifikasi tetap tersedia di Inbox."
      : push.iosNeedsInstall
        ? "Di iPhone, pasang aplikasi ke Layar Utama (Bagikan → Tambah ke Layar Utama) untuk menerima notifikasi."
        : "Perangkat atau browser ini belum mendukung notifikasi push. Notifikasi tetap tersedia di Inbox.";
  else if (push.permission === "denied") status = "Izin notifikasi diblokir. Aktifkan kembali lewat pengaturan browser/aplikasi, lalu tekan Aktifkan.";
  else if (push.enabled) status = "Aktif di perangkat ini. Jenis notifikasi dapat diatur di Preferensi notifikasi.";
  else status = "Belum aktif. Notifikasi hanya terlihat saat Anda membuka aplikasi.";
  return (
    <section className={className}>
      <div className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-card">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <BellRing size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold">Notifikasi push</div>
          <p className="mt-0.5 text-[12px] text-neutral-600">{status}</p>
          {push.error && <p className="mt-1 text-[12px] text-critical">{push.error}</p>}
        </div>
        {push.support !== "unsupported" &&
          (push.enabled ? (
            <Button
              size="sm"
              variant="outline"
              loading={push.busy}
              onClick={async () => {
                await push.disable();
                toast.toast("Notifikasi push dimatikan di perangkat ini.");
              }}
            >
              Matikan
            </Button>
          ) : (
            <Button
              size="sm"
              loading={push.busy}
              onClick={async () => {
                if (await push.enable()) toast.success("Notifikasi diaktifkan.");
              }}
            >
              Aktifkan
            </Button>
          ))}
      </div>
    </section>
  );
}
