import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Page, TopBar } from "@/components/ui/shell";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/http";

export default function ChangePasswordPage() {
  const nav = useNavigate();
  const toast = useToast();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/[0-9]/.test(next)) return setError("Password baru minimal 8 karakter, kombinasi huruf dan angka.");
    if (next !== confirm) return setError("Konfirmasi password tidak sama.");
    setLoading(true);
    try {
      await api().changePassword(cur, next);
      toast.success("Password berhasil diubah.");
      nav(-1);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page className="bg-card">
      <TopBar title="Ganti Password" />
      <form onSubmit={submit} className="flex flex-col gap-5 px-4 pt-6">
        <Input label="Password saat ini" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
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
      </form>
    </Page>
  );
}
