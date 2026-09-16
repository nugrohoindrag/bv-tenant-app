// Tenant Account Validation (PRD P1 §6 Tenant Onboarding; AC-06..08): pendaftaran memberi tahu Tenant Relation; akun aktif setelah
// divalidasi building management (notifikasi/email). Halaman ini hanya informasi status.
import { ChevronLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cityscape, MailIllustration } from "@/components/illustrations";

export default function ValidationPage() {
  const nav = useNavigate();
  const { state } = useLocation() as { state?: { userId?: string; email?: string; message?: string } };

  return (
    <div className="app-shell relative flex min-h-dvh flex-col overflow-hidden bg-card">
      <div className="relative z-10 flex flex-1 flex-col px-4 pb-[calc(var(--safe-bottom)+16px)] pt-[calc(var(--safe-top)+8px)]">
        <button type="button" onClick={() => nav("/login", { replace: true })} aria-label="Kembali" className="tap -ml-1 flex h-10 w-10 items-center justify-center text-brand-500">
          <ChevronLeft size={28} strokeWidth={2.5} />
        </button>
        <div className="flex flex-1 flex-col items-center justify-center text-center fade-up">
          <MailIllustration />
          <h1 className="mt-10 text-[22px] font-bold">Tenant Account Validation</h1>
          <p className="mt-4 text-[17px] leading-relaxed">{state?.message ?? "Pendaftaran diterima. Akun akan aktif setelah divalidasi building management."}</p>
          <p className="mt-6 text-[15px] leading-relaxed text-neutral-600">
            Kami akan memberi tahu {state?.email ? <span className="font-semibold">{state.email}</span> : "Anda"} setelah validasi selesai. Sampai saat itu, login belum dapat dilakukan.
          </p>
        </div>
        <Button block size="lg" onClick={() => nav("/login", { replace: true })}>
          Ke Halaman Login
        </Button>
      </div>
      <Cityscape className="absolute bottom-0 left-0 h-[220px] opacity-70" />
    </div>
  );
}
