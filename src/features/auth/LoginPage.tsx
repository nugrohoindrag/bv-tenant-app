// Login (Figma Register & Login 1): logo, email, password, tombol gradient, link Register, siluet kota.
// PRD P3 v2.1: akun menunggu/ditolak/ditangguhkan menampilkan status + alasan + "Hubungi pengelola via WhatsApp" (B-08,
// P3-ACC-07, P3-WAM-05); "Lupa password?" mengarahkan ke pengelola (reset oleh Tenant Relation → wajib ganti, P3-ACC-05).
// Di perangkat baru (belum ada kontak tersimpan) nomor pengelola diambil dari daftar property registrasi publik.
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Clock, KeyRound, Mail, ShieldX, UserX } from "lucide-react";
import { useAuth } from "@/app/auth";
import { API_MODE } from "@/api";
import type { AccountStatusMeta } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { Cityscape, Logo } from "@/components/illustrations";
import { PublicContactButtons, WhatsAppButton, usePublicContacts } from "@/components/contact";
import { errorMessage, isApiError } from "@/lib/http";
import { rememberManagementContact } from "@/lib/whatsapp";

const STATUS_CODES = ["ACCOUNT_PENDING", "ACCOUNT_REJECTED", "ACCOUNT_SUSPENDED"] as const;
type StatusCode = (typeof STATUS_CODES)[number];

export interface AccountStatusNotice {
  code: StatusCode;
  title: string;
  message: string;
  reason: string | null;
  propertyName: string | null;
  whatsapp: string | null;
}

/** Problem login akun non-aktif → isi kartu status (null bila bukan kasus status akun). */
export function accountStatusNotice(e: unknown): AccountStatusNotice | null {
  if (!isApiError(e) || !(STATUS_CODES as readonly string[]).includes(e.code)) return null;
  const meta = (e.problem.meta ?? {}) as AccountStatusMeta;
  const code = e.code as StatusCode;
  const text: Record<StatusCode, [string, string]> = {
    ACCOUNT_PENDING: ["Akun menunggu validasi", "Pendaftaran Anda sedang diperiksa building management. Anda dapat login setelah akun divalidasi."],
    ACCOUNT_REJECTED: ["Pendaftaran akun ditolak", "Building management tidak dapat memvalidasi pendaftaran Anda."],
    ACCOUNT_SUSPENDED: ["Akun ditangguhkan", "Akun Anda sedang ditangguhkan sehingga belum dapat digunakan."],
  };
  return { code, title: text[code][0], message: text[code][1], reason: meta.reason?.trim() || null, propertyName: meta.property_name ?? null, whatsapp: meta.whatsapp_number ?? null };
}

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AccountStatusNotice | null>(null);
  const [forgot, setForgot] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    if (!email.trim() || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      nav(loc.state?.from && loc.state.from !== "/login" ? loc.state.from : "/", { replace: true });
    } catch (err) {
      const notice = accountStatusNotice(err);
      if (notice) {
        setStatus(notice);
        if (notice.whatsapp) rememberManagementContact({ whatsapp_number: notice.whatsapp, property_name: notice.propertyName });
        return;
      }
      const codeMsg: Record<string, string> = { NOT_TENANT_ACCOUNT: "Akun ini bukan akun Tenant App. Gunakan Dashboard untuk akun staf.", INVALID_CREDENTIALS: "Email atau password salah.", ACCOUNT_LOCKED: "Terlalu banyak percobaan login. Coba lagi beberapa saat lagi." };
      setError((isApiError(err) && codeMsg[err.code]) || errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function approveMock() {
    const { mockApproveAll } = await import("@/api/mock/api");
    const n = mockApproveAll();
    toast.success(n ? `${n} akun disetujui (simulasi).` : "Tidak ada akun pending.");
    setStatus(null);
  }

  const contacts = usePublicContacts(forgot);
  const knownProperty = contacts.primary?.property_name;
  return (
    <div className="app-shell relative flex min-h-dvh flex-col overflow-hidden bg-card">
      <form onSubmit={submit} className="relative z-10 flex flex-1 flex-col px-8 pb-[200px] pt-[calc(var(--safe-top)+48px)]">
        <div className="flex flex-col items-center">
          <Logo size={72} />
          <div className="mt-2 text-[17px] font-semibold">BuildingVision</div>
        </div>
        <div className="mt-12 flex flex-col gap-6">
          <Input leading={<Mail size={20} />} placeholder="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input leading={<KeyRound size={20} />} placeholder="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="mt-2 text-right">
          <button type="button" onClick={() => setForgot(true)} className="text-[13px] font-semibold text-brand-600">
            Lupa password? Hubungi pengelola
          </button>
        </div>
        {error && (
          <div role="alert" className="mt-4 rounded-lg bg-critical-soft px-3 py-2 text-sm text-critical-text">
            {error}
          </div>
        )}
        {status && <AccountStatusCard notice={status} email={email.trim()} onMockApprove={API_MODE === "mock" && status.code === "ACCOUNT_PENDING" ? approveMock : undefined} />}
        <Button block size="lg" type="submit" loading={loading} className="mt-8">
          Login
        </Button>
        <p className="mt-4 text-center text-[15px]">
          Belum punya akun?{" "}
          <Link to="/register" className="font-semibold text-brand-600">
            Register
          </Link>
        </p>
        {API_MODE === "mock" && (
          <button
            type="button"
            onClick={() => {
              setEmail("yosep@demo.buildingvision.id");
              setPassword("Demo12345!");
            }}
            className="mt-6 text-xs text-neutral-400 underline"
          >
            Isi akun demo (yosep@demo.buildingvision.id)
          </button>
        )}
      </form>
      <Cityscape className="absolute bottom-0 left-0 h-[200px]" />

      <Sheet open={forgot} onClose={() => setForgot(false)} title="Lupa password">
        <div className="space-y-3 text-[14px] text-neutral-700">
          <p>Password akun Tenant App direset oleh pengelola gedung{knownProperty ? ` ${knownProperty}` : ""}.</p>
          <ol className="list-decimal space-y-1 pl-5 text-[13px]">
            <li>Hubungi pengelola dan sebutkan email akun Anda.</li>
            <li>Pengelola mengirim password sementara (biasanya lewat WhatsApp).</li>
            <li>Login dengan password sementara, lalu buat password baru.</li>
          </ol>
          {contacts.primary || contacts.options.length ? (
            <PublicContactButtons contacts={contacts} text={(prop) => `Halo pengelola${prop ? ` ${prop}` : ""}, saya lupa password akun Tenant App${email.trim() ? ` (${email.trim()})` : ""}. Mohon bantu reset password. Terima kasih.`} />
          ) : (
            <p className="rounded-lg bg-neutral-100 px-3 py-2 text-[13px]">Hubungi resepsionis atau kantor building management gedung Anda untuk reset password.</p>
          )}
        </div>
      </Sheet>
    </div>
  );
}

function AccountStatusCard({ notice, email, onMockApprove }: { notice: AccountStatusNotice; email: string; onMockApprove?: () => void }) {
  const Icon = notice.code === "ACCOUNT_PENDING" ? Clock : notice.code === "ACCOUNT_REJECTED" ? UserX : ShieldX;
  const tone = notice.code === "ACCOUNT_PENDING" ? "bg-warning-soft text-warning-text" : "bg-critical-soft text-critical-text";
  // meta login tanpa nomor → cari dari daftar property registrasi (perangkat baru)
  const fallback = usePublicContacts(!notice.whatsapp, notice.propertyName);
  const waText = (prop: string | null) => `Halo pengelola${prop ? ` ${prop}` : ""}, saya ingin menanyakan status akun Tenant App saya${email ? ` (${email})` : ""}: ${notice.title.toLowerCase()}.`;
  return (
    <div role="alert" className={`mt-4 rounded-xl p-4 ${tone}`}>
      <div className="flex items-center gap-2 text-[15px] font-bold">
        <Icon size={18} /> {notice.title}
      </div>
      <p className="mt-1 text-[13px]">{notice.message}</p>
      {notice.reason && (
        <p className="mt-2 rounded-lg bg-white/60 px-3 py-2 text-[13px]">
          <span className="font-semibold">Alasan:</span> {notice.reason}
        </p>
      )}
      {notice.propertyName && <p className="mt-2 text-[12px]">Property: {notice.propertyName}</p>}
      {notice.whatsapp ? (
        <WhatsAppButton number={notice.whatsapp} text={waText(notice.propertyName)} className="mt-3" />
      ) : fallback.primary || fallback.options.length ? (
        <PublicContactButtons contacts={fallback} text={(prop) => waText(prop ?? notice.propertyName)} className="mt-3" />
      ) : (
        <p className="mt-2 text-[12px]">Hubungi building management gedung Anda untuk informasi lebih lanjut.</p>
      )}
      {onMockApprove && (
        <button type="button" onClick={onMockApprove} className="mt-2 block text-[12px] font-bold underline">
          Simulasi: setujui akun (mode demo)
        </button>
      )}
    </div>
  );
}
