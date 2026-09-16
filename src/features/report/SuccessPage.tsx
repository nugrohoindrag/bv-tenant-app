// Laporan Berhasil Dibuat (Figma): balon ucapan, ilustrasi, "SELAMAT !! LAPORAN BERHASIL DIKIRIM", gelombang teal + tombol kembali.
import { Link, useNavigate, useParams } from "react-router-dom";
import { SuccessIllustration } from "@/components/illustrations";

export default function SuccessPage() {
  const nav = useNavigate();
  const { id } = useParams();
  return (
    <div className="app-shell relative flex min-h-dvh flex-col overflow-hidden bg-card">
      <div className="px-8 pt-[calc(var(--safe-top)+24px)]">
        <div className="relative mx-auto max-w-[300px] rounded-2xl bg-gradient-brand px-6 py-4 text-center text-[19px] font-semibold leading-snug text-white shadow-float fade-up">
          Ticket Anda sudah diterima. Building management akan segera menindaklanjuti.
          <span className="absolute -bottom-3 right-10 h-0 w-0 border-l-[14px] border-t-[16px] border-l-transparent border-t-[#2aa9b6]" />
        </div>
      </div>
      <div className="px-4 pt-6">
        <SuccessIllustration />
      </div>
      <div className="mt-2 text-center">
        <div className="text-[44px] font-extrabold leading-none text-gradient-brand">TERKIRIM</div>
        <div className="mt-3 px-6 text-[24px] font-bold leading-tight text-gradient-brand">TICKET BERHASIL DIBUAT</div>
        {id && (
          <Link to={`/requests/${id}`} className="mt-4 inline-block text-[15px] font-semibold text-brand-600 underline">
            Lihat detail & tracking ticket
          </Link>
        )}
      </div>
      <div className="relative mt-8 flex flex-1 flex-col justify-end">
        <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="absolute -top-px h-[60px] w-full" aria-hidden>
          <path d="M0 60 C 120 0, 280 0, 400 60 Z" fill="#fff" />
        </svg>
        <div className="bg-gradient-brand-v px-4 pb-[calc(var(--safe-bottom)+24px)] pt-24">
          <svg viewBox="0 0 400 120" className="pointer-events-none absolute inset-x-0 top-14 w-full" aria-hidden>
            {Array.from({ length: 24 }, (_, i) => {
              const row = Math.floor(i / 8);
              const x = 30 + (i % 8) * 50 + (row % 2 ? 25 : 0);
              return <rect key={i} x={x} y={10 + row * 34} width="12" height="12" fill="#fff" transform={`rotate(45 ${x + 6} ${16 + row * 34})`} />;
            })}
          </svg>
          <button type="button" onClick={() => nav("/", { replace: true })} className="tap relative h-14 w-full rounded-full bg-white text-[20px] font-bold text-brand-600 shadow-float">
            KEMBALI KE HALAMAN UTAMA
          </button>
        </div>
      </div>
    </div>
  );
}
