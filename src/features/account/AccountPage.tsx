// Akun (tab, D-P3-01): identitas + ubah profil (P3-ACC-04), ringkasan unit aktif → My Unit (P3-UNT-01), push di perangkat ini
// (P3-PSH-01/02), preferensi notifikasi (P3-ACC-09), anggota tenant untuk Tenant Admin (P3-ACC-08), masukan umum (P3-FDB-02),
// ganti password, "Hubungi pengelola via WhatsApp" (P3-WAM-05), install app, logout.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Building2, ChevronRight, Download, Info, KeyRound, LogOut, MessageSquareText, Pencil, RotateCcw, Users } from "lucide-react";
import { API_MODE } from "@/api";
import { useAuth } from "@/app/auth";
import { Button } from "@/components/ui/button";
import { HeaderActions, Page, TopBar } from "@/components/ui/shell";
import { Avatar, Dialog } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { WhatsAppButton } from "@/components/contact";
import { PushSettingsCard } from "@/components/push-card";
import { term } from "@/lib/terms";
import { OWNERSHIP_LABEL } from "@/lib/labels";
import { useActiveUnit } from "@/lib/active-unit";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PROFILE: Record<string, string> = { hotel: "Hotel", apartment: "Apartment", office: "Office" };

export default function AccountPage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [install, setInstall] = useState<BeforeInstallPromptEvent | null>(null);
  const unit = useActiveUnit(user);
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
  const myUnit = term(user, "my_unit");

  const rows = [
    { icon: Building2, label: myUnit, hint: user.units.length > 1 ? `${user.units.length} unit` : undefined, onClick: () => nav("/units") },
    ...(user.is_tenant_admin ? [{ icon: Users, label: `Anggota ${term(user, "customer")}`, hint: "Tenant Admin", onClick: () => nav("/account/members") }] : []),
    { icon: MessageSquareText, label: "Masukan untuk pengelola", onClick: () => nav("/feedback") },
    { icon: Bell, label: "Preferensi notifikasi", onClick: () => nav("/account/notifications") },
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
    { icon: Info, label: `Tentang · v${__APP_VERSION__} · ${API_MODE === "mock" ? "mode demo" : "terhubung server"}`, onClick: () => toast.toast("BuildingVision Tenant App") },
  ];

  return (
    <Page bottomNav>
      <TopBar title="Akun" onBack={false} transparent className="absolute inset-x-0 z-40 text-white" right={<HeaderActions light />} />
      <div className="relative overflow-hidden bg-gradient-brand px-4 pb-16 pt-[calc(var(--safe-top)+64px)] text-white">
        <div className="flex items-center gap-4">
          <Avatar name={user.full_name} size={64} color="rgba(255,255,255,.25)" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[20px] font-bold">{user.full_name}</div>
            <div className="truncate text-[13px] text-white/85">{user.email ?? "—"}</div>
            <div className="text-[13px] text-white/85">{user.phone ?? "Nomor telepon belum diisi"}</div>
          </div>
          <button type="button" onClick={() => nav("/account/profile")} className="tap flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-[12px] font-bold">
            <Pencil size={14} /> Ubah
          </button>
        </div>
      </div>
      <div className="-mt-10 space-y-4 px-4 pb-6">
        <button type="button" onClick={() => nav("/units")} className="tap w-full rounded-2xl bg-card p-4 text-left shadow-float">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-bold text-brand-600">
              <Building2 size={16} /> {myUnit}
            </div>
            <span className="flex items-center text-[12px] font-semibold text-brand-600">
              Lihat detail <ChevronRight size={16} />
            </span>
          </div>
          {unit ? (
            <div className="mt-2 grid grid-cols-2 gap-y-2 text-[13px]">
              <Item label="Property" value={`${user.property.name} · ${PROFILE[user.property.profile] ?? user.property.profile}`} />
              <Item label={term(user, "inventory_unit")} value={unit.name} />
              <Item label="Status" value={user.ownership_status ? (OWNERSHIP_LABEL[user.ownership_status] ?? user.ownership_status) : "—"} />
              <Item label="Peran akun" value={user.role === "tenant_admin" ? "Admin tenant" : "Pengguna"} />
              {user.tenant && <Item label={term(user, "customer")} value={`${user.tenant.name} (${user.tenant.code})`} />}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Data unit belum tersedia. Hubungi building management.</p>
          )}
        </button>

        <PushSettingsCard />

        <section className="overflow-hidden rounded-2xl bg-card shadow-card">
          {rows.map((r, i) => (
            <button key={r.label} type="button" onClick={r.onClick} className={"tap flex w-full items-center gap-3 px-4 py-3.5 text-left text-[14px] font-semibold" + (i ? " border-t border-border" : "")}>
              <r.icon size={20} className="text-brand-600" />
              <span className="flex-1">{r.label}</span>
              {"hint" in r && r.hint && <span className="text-[11px] font-semibold text-neutral-400">{r.hint}</span>}
              <ChevronRight size={18} className="text-neutral-400" />
            </button>
          ))}
        </section>

        {user.whatsapp_number && (
          <section className="rounded-2xl bg-card p-4 shadow-card">
            <div className="text-[14px] font-bold">Butuh bantuan?</div>
            <p className="mb-3 mt-0.5 text-[12px] text-neutral-600">Hubungi pengelola {user.property.name} lewat WhatsApp untuk hal di luar aplikasi.</p>
            <WhatsAppButton number={user.whatsapp_number} variant="outline" text={`Halo pengelola ${user.property.name}, saya ${user.full_name}${unit ? ` (${unit.name})` : ""}. `} />
          </section>
        )}

        {API_MODE === "mock" && (
          <button
            type="button"
            onClick={async () => {
              const { resetMock } = await import("@/api/mock/api");
              resetMock();
              await logout();
              nav("/login", { replace: true });
            }}
            className="flex w-full items-center justify-center gap-2 text-xs text-neutral-400"
          >
            <RotateCcw size={14} /> Reset data demo
          </button>
        )}

        <Button block variant="outline" className="border-critical text-critical" onClick={() => setConfirm(true)}>
          <LogOut size={18} /> Keluar
        </Button>
      </div>

      <Dialog open={confirm} onClose={() => setConfirm(false)} title="Keluar dari akun?">
        <p className="text-sm text-neutral-700">Anda perlu login kembali untuk melihat laporan dan tagihan. Notifikasi push di perangkat ini dihentikan.</p>
        <div className="mt-5 flex gap-3">
          <Button variant="outline" block onClick={() => setConfirm(false)}>
            Batal
          </Button>
          <Button
            variant="danger"
            block
            loading={leaving}
            onClick={async () => {
              setLeaving(true);
              try {
                await logout();
              } finally {
                setLeaving(false);
                nav("/login", { replace: true });
              }
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
