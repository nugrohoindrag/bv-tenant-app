// Ganti password (P3-ACC-06) + mode wajib (P3-ACC-03): akun dengan password sementara (dibuat/di-reset pengelola) diarahkan ke
// sini oleh RequireAuth sampai password baru disimpan; setelah itu /tenant/me tidak lagi membawa must_change_password.
// Server juga menolak panggilan lain (403 PASSWORD_CHANGE_REQUIRED) sampai password diganti; query yang tertolak dimuat ulang.
import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { api } from "@/api";
import { useAuth } from "@/app/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Page, TopBar } from "@/components/ui/shell";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/http";

export function passwordProblem(next: string, confirm: string, current?: string): string | null {
  if (next.length < 8 || !/[A-Za-z]/.test(next) || !/[0-9]/.test(next)) return "Password baru minimal 8 karakter, kombinasi huruf dan angka.";
  if (next !== confirm) return "Konfirmasi password tidak sama.";
  if (current !== undefined && current === next) return "Password baru harus berbeda dari password saat ini.";
  return null;
}

export default function ChangePasswordPage() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const toast = useToast();
  const qc = useQueryClient();
  const { user, refresh, applyUser, logout } = useAuth();
  const forced = !!user?.must_change_password;
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const p = passwordProblem(next, confirm, cur);
    if (p) return setError(p);
    setLoading(true);
    try {
      await api().changePassword(cur, next);
      toast.success("Password berhasil diubah.");
      if (forced) {
        // flag server sudah hilang; bila /tenant/me gagal dimuat, hapus flag lokal agar tidak terkunci di halaman ini
        await refresh().catch(() => user && applyUser({ ...user, must_change_password: false }));
        void qc.invalidateQueries();
        const from = loc.state?.from;
        nav(from && from !== "/account/password" ? from : "/", { replace: true });
      } else nav(-1);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page className="bg-card">
      <TopBar title={forced ? "Buat Password Baru" : "Ganti Password"} onBack={forced ? false : undefined} />
      <form onSubmit={submit} className="flex flex-col gap-5 px-4 pt-6">
        {forced && (
          <div className="flex gap-3 rounded-xl bg-warning-soft p-3 text-[13px] text-warning-text">
            <ShieldAlert size={20} className="shrink-0" />
            <p>Anda masuk dengan password sementara dari pengelola gedung. Buat password baru untuk melanjutkan menggunakan aplikasi.</p>
          </div>
        )}
        <Input label={forced ? "Password sementara" : "Password saat ini"} type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
        <Input label="Password baru" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} hint="Minimal 8 karakter, kombinasi huruf dan angka." />
        <Input label="Konfirmasi password baru" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {error && (
          <div role="alert" className="rounded-lg bg-critical-soft px-3 py-2 text-sm text-critical-text">
            {error}
          </div>
        )}
        <Button block size="lg" type="submit" loading={loading} className="mt-4">
          Simpan
        </Button>
        {forced && (
          <button
            type="button"
            onClick={async () => {
              await logout();
              nav("/login", { replace: true });
            }}
            className="text-center text-[13px] font-semibold text-neutral-500"
          >
            Keluar
          </button>
        )}
      </form>
    </Page>
  );
}
