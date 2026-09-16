// Login (Figma Register & Login 1): logo, email, password, tombol gradient, link Register, siluet kota.
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { KeyRound, Mail } from "lucide-react";
import { useAuth } from "@/app/auth";
import { API_MODE } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { Cityscape, Logo } from "@/components/illustrations";
import { errorMessage, isApiError } from "@/lib/http";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(false);
    if (!email.trim() || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      nav(loc.state?.from && loc.state.from !== "/login" ? loc.state.from : "/", { replace: true });
    } catch (err) {
      if (isApiError(err) && err.code === "ACCOUNT_PENDING") setPending(true);
      const codeMsg: Record<string, string> = { ACCOUNT_PENDING: "Akun Anda belum divalidasi building management.", ACCOUNT_REJECTED: "Pendaftaran akun Anda ditolak. Hubungi building management.", ACCOUNT_SUSPENDED: "Akun Anda ditangguhkan. Hubungi building management.", NOT_TENANT_ACCOUNT: "Akun ini bukan akun Tenant App. Gunakan Dashboard untuk akun staf.", INVALID_CREDENTIALS: "Email atau password salah." };
      setError((isApiError(err) && codeMsg[err.code]) || errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function approveMock() {
    const { mockApproveAll } = await import("@/api/mock/api");
    const n = mockApproveAll();
    toast.success(n ? `${n} akun disetujui (simulasi).` : "Tidak ada akun pending.");
    setPending(false);
    setError(null);
  }

  return (
    <div className="app-shell relative flex min-h-dvh flex-col overflow-hidden bg-card">
      <form onSubmit={submit} className="relative z-10 flex flex-1 flex-col px-8 pt-[calc(var(--safe-top)+48px)]">
        <div className="flex flex-col items-center">
          <Logo size={72} />
          <div className="mt-2 text-[17px] font-semibold">BuildingVision</div>
        </div>
        <div className="mt-12 flex flex-col gap-6">
          <Input leading={<Mail size={20} />} placeholder="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input leading={<KeyRound size={20} />} placeholder="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && (
          <div role="alert" className="mt-4 rounded-lg bg-critical-soft px-3 py-2 text-sm text-critical-text">
            {error}
            {pending && API_MODE === "mock" && (
              <button type="button" onClick={approveMock} className="mt-1 block font-bold underline">
                Simulasi: setujui akun (mode demo)
              </button>
            )}
          </div>
        )}
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
          <button type="button" onClick={() => { setEmail("yosep@demo.buildingvision.id"); setPassword("Demo12345!"); }} className="mt-6 text-xs text-neutral-400 underline">
            Isi akun demo (yosep@demo.buildingvision.id)
          </button>
        )}
      </form>
      <Cityscape className="absolute bottom-0 left-0 h-[200px]" />
    </div>
  );
}
