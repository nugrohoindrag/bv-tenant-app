// Visitors (PRD P1 v1.3 §3.7 Visitor Management; nav Visitors): pra-registrasi tamu oleh tenant, pass/QR, status kunjungan.
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, QrCode, UserRoundPlus } from "lucide-react";
import { api } from "@/api";
import type { Visitor } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Page, TabHeader } from "@/components/ui/shell";
import { EmptyState, ErrorState, Skeleton, StatusBadge } from "@/components/ui/misc";
import { errorMessage } from "@/lib/http";
import { fmtDayShort, fmtTime } from "@/lib/terms";

export default function VisitorsPage() {
  const nav = useNavigate();
  const q = useQuery({ queryKey: ["visitors", {}], queryFn: () => api().visitors(), refetchInterval: 30_000 });
  const rows = q.data ?? [];
  const upcoming = rows.filter((v) => ["pending_approval", "registered", "checked_in"].includes(v.status));
  const past = rows.filter((v) => !["pending_approval", "registered", "checked_in"].includes(v.status));
  return (
    <Page bottomNav>
      <TabHeader title="Visitors" subtitle="Daftarkan tamu agar akses di lobi lebih cepat" right={<Button size="sm" onClick={() => nav("/visitors/new")}><UserRoundPlus size={16} /> Tamu</Button>} />
      <div className="flex flex-col gap-3 px-4 pb-4 pt-1">
        {q.isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-[84px] rounded-xl" />)
        ) : q.error ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<UserRoundPlus size={48} />} title="Belum ada tamu terdaftar" description="Daftarkan tamu; security akan memverifikasi pass saat kedatangan." action={<Button onClick={() => nav("/visitors/new")}>Daftarkan tamu</Button>} />
        ) : (
          <>
            {upcoming.length > 0 && <h2 className="text-[13px] font-bold uppercase text-neutral-500">Akan datang</h2>}
            {upcoming.map((v) => <VisitorCard key={v.id} v={v} onClick={() => nav(`/visitors/${v.id}`)} />)}
            {past.length > 0 && <h2 className="mt-2 text-[13px] font-bold uppercase text-neutral-500">Riwayat</h2>}
            {past.map((v) => <VisitorCard key={v.id} v={v} onClick={() => nav(`/visitors/${v.id}`)} />)}
          </>
        )}
      </div>
    </Page>
  );
}

function VisitorCard({ v, onClick }: { v: Visitor; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="tap flex items-center gap-3 rounded-xl bg-card p-4 text-left shadow-card">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-sky text-white">{v.pass ? <QrCode size={20} /> : <UserRoundPlus size={20} />}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold text-neutral-800">{v.visitor_name}{v.headcount > 1 ? <span className="text-[12px] font-normal text-neutral-500"> +{v.headcount - 1}</span> : null}</div>
        <div className="text-[12px] text-neutral-500">
          {fmtDayShort(v.expected_at)} {fmtTime(v.expected_at)}
          {v.purpose ? ` · ${v.purpose}` : ""}
        </div>
        <div className="mt-1"><StatusBadge status={v.status} objectType="visitor" /></div>
      </div>
      <ChevronRight size={18} className="text-neutral-400" />
    </button>
  );
}
