// Profile (nav Profile): identitas + unit/area akses (dari /tenant/me), terminologi profile property, menu (ganti sandi, install app), logout.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronRight, Download, Info, KeyRound, LogOut, RotateCcw, Wallet } from "lucide-react";
import { API_MODE } from "@/api";
import { useAuth } from "@/app/auth";
import { Button } from "@/components/ui/button";
import { Page, TopBar } from "@/components/ui/shell";
import { term } from "@/lib/terms";
import { Avatar, Dialog } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const ownership: Record<string, string> = { owner: "Pemilik", tenant: "Penyewa", family: "Keluarga", guest: "Tamu", employee: "Karyawan" };
const PROFILE: Record<string, string> = { hotel: "Hotel", apartment: "Apartment", office: "Office" };

export default function AccountPage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [install, setInstall] = useState<BeforeInstallPromptEvent | null>(null);
  const standalone = typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setInstall(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  if (!user) return null;
  const unit = user.primary_unit;

  const rows = [
    { icon: Wallet, label: "Tagihan & Pembayaran", onClick: () => nav("/bills") },
    { icon: KeyRound, label: "Ganti Password", onClick: () => nav("/account/password") },
    ...(!standalone && install
      ? [
          {
            icon: Download,
            label: "Pasang aplikasi di layar utama",
            onClick: async () => {
              await install.prompt();
              const r = await install.userChoice;
              if (r.outcome === "accepted") setInstall(null);
            },
          },
        ]
      : []),
    { icon: Info, label: `Tentang · v${__APP_VERSION__} · ${API_MODE === "mock" ? "mode demo" : "terhubung server"}`, onClick: () => toast.toast("BuildingVision Tenant PWA") },
  ];

  return (
    <Page bottomNav>
      <TopBar title="Profile" onBack={() => nav("/")} transparent className="absolute inset-x-0 z-40 text-white" />
      <div className="relative overflow-hidden bg-gradient-brand px-4 pb-16 pt-[calc(var(--safe-top)+64px)] text-white">
        <div className="flex items-center gap-4">
          <Avatar name={user.full_name} size={64} color="rgba(255,255,255,.25)" />
          <div className="min-w-0">
            <div className="truncate text-[20px] font-bold">{user.full_name}</div>
            <div className="truncate text-[13px] text-white/85">{user.email ?? "—"}</div>
            <div className="text-[13px] text-white/85">{user.phone ?? "—"}</div>
          </div>
        </div>
      </div>
      <div className="-mt-10 px-4">
        <section className="rounded-2xl bg-card p-4 shadow-float">
          <div className="flex items-center gap-2 text-[13px] font-bold text-brand-600">
            <Building2 size={16} /> {term(user, "my_unit")}
          </div>
          {unit ? (
            <div className="mt-2 grid grid-cols-2 gap-y-2 text-[13px]">
              <Item label="Property" value={`${user.property.name} · ${PROFILE[user.property.profile] ?? user.property.profile}`} />
              <Item label="Unit" value={unit.name} />
              <Item label="Lokasi" value={unit.path_text} />
              <Item label="Status" value={user.ownership_status ? (ownership[user.ownership_status] ?? user.ownership_status) : "—"} />
              {user.tenant && <Item label={term(user, "customer")} value={`${user.tenant.name} (${user.tenant.code})`} />}
              <Item label="Peran akun" value={user.role === "tenant_admin" ? "Admin unit" : "Pengguna"} />
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Data unit belum tersedia. Hubungi building management.</p>
          )}
          {user.units.length > 1 && <p className="mt-2 text-[12px] text-neutral-500">Akses unit lain: {user.units.filter((u) => !u.is_primary).map((u) => u.name).join(", ")}</p>}
          {user.areas.length > 0 && <p className="mt-1 text-[12px] text-neutral-500">Area akses khusus: {user.areas.map((a) => a.name).join(", ")}</p>}
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl bg-card shadow-card">
          {rows.map((r, i) => (
            <button key={r.label} type="button" onClick={r.onClick} className={"tap flex w-full items-center gap-3 px-4 py-3.5 text-left text-[14px] font-semibold" + (i ? " border-t border-border" : "")}>
              <r.icon size={20} className="text-brand-600" />
              <span className="flex-1">{r.label}</span>
              <ChevronRight size={18} className="text-neutral-400" />
            </button>
          ))}
        </section>

        {API_MODE === "mock" && (
          <button
            type="button"
            onClick={async () => {
              const { resetMock } = await import("@/api/mock/api");
              resetMock();
              await logout();
              nav("/login", { replace: true });
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 text-xs text-neutral-400"
          >
            <RotateCcw size={14} /> Reset data demo
          </button>
        )}

        <Button block variant="outline" className="mt-6 border-critical text-critical" onClick={() => setConfirm(true)}>
          <LogOut size={18} /> Keluar
        </Button>
      </div>

      <Dialog open={confirm} onClose={() => setConfirm(false)} title="Keluar dari akun?">
        <p className="text-sm text-neutral-700">Anda perlu login kembali untuk melihat laporan dan tagihan.</p>
        <div className="mt-5 flex gap-3">
          <Button variant="outline" block onClick={() => setConfirm(false)}>
            Batal
          </Button>
          <Button
            variant="danger"
            block
            onClick={async () => {
              await logout();
              nav("/login", { replace: true });
            }}
          >
            Keluar
          </Button>
        </div>
      </Dialog>
    </Page>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-neutral-400">{label}</div>
      <div className="font-bold text-neutral-800">{value}</div>
    </div>
  );
}
