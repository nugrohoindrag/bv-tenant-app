// Onboarding (Figma Onboard 1-2): slide "Living" dst → layar Welcome dengan Register/Login.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth";
import { Button } from "@/components/ui/button";
import { LivingIllustration, WelcomeIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";

const slides = [
  { title: "Living", body: "Dapatkan pengumuman, cek tagihan, dan hubungi Tenant Relation.", art: <LivingIllustration className="max-w-[260px]" /> },
  { title: "Lapor & Pantau", body: "Buat laporan keluhan dengan foto, lalu pantau progres pengerjaan sampai selesai.", art: <LivingIllustration className="max-w-[260px] -scale-x-100" /> },
  { title: "Terhubung", body: "Berita gedung, listing properti, dan notifikasi penting langsung di genggaman.", art: <LivingIllustration className="max-w-[260px]" /> },
];

export default function OnboardingPage() {
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const nav = useNavigate();
  const { setOnboarded } = useAuth();

  const finish = (to: string) => {
    setOnboarded();
    nav(to);
  };

  if (done) {
    return (
      <div className="app-shell flex min-h-dvh flex-col bg-card px-6 pb-[calc(var(--safe-bottom)+24px)] pt-[calc(var(--safe-top)+56px)]">
        <h1 className="text-center text-[20px] font-semibold leading-snug">Selamat datang di BuildingVision, manajemen properti pintar Anda</h1>
        <div className="flex flex-1 items-center justify-center">
          <WelcomeIllustration className="max-w-[320px]" />
        </div>
        <div className="flex flex-col gap-3">
          <Button block size="lg" onClick={() => finish("/register")}>
            Register
          </Button>
          <Button block size="lg" variant="outline" className="border-neutral-300 text-foreground" onClick={() => finish("/login")}>
            Login
          </Button>
          <p className="mt-2 text-center text-[15px]">
            Baca <span className="font-semibold text-brand-600">syarat & kebijakan privasi</span>.
          </p>
        </div>
      </div>
    );
  }

  const s = slides[i]!;
  return (
    <div className="app-shell flex min-h-dvh flex-col bg-card px-6 pb-[calc(var(--safe-bottom)+24px)] pt-[calc(var(--safe-top)+48px)]">
      <div className="flex justify-end">
        <button type="button" onClick={() => setDone(true)} className="text-sm font-semibold text-neutral-500">
          Lewati
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center pt-6 fade-up" key={i}>
        {s.art}
        <h1 className="mt-8 text-[20px] font-semibold">{s.title}</h1>
        <p className="mt-6 max-w-[280px] text-center text-[15px] leading-relaxed text-foreground">{s.body}</p>
      </div>
      <div className="mb-6 flex items-center justify-center gap-2">
        {slides.map((_, k) => (
          <button key={k} type="button" aria-label={`Slide ${k + 1}`} onClick={() => setI(k)} className={cn("h-1 rounded-full transition-all", k === i ? "w-6 bg-success" : "w-4 bg-neutral-300")} />
        ))}
      </div>
      <Button block size="lg" onClick={() => (i < slides.length - 1 ? setI(i + 1) : setDone(true))}>
        {i < slides.length - 1 ? "Lanjut" : "Get Started"}
      </Button>
    </div>
  );
}
