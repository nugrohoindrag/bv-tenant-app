// My Unit (P3-UNT-01, label per profile: Unit Saya / Kamar Saya). Satu unit → detail langsung; beberapa unit → daftar dengan
// ringkasan & pengganti unit aktif (P3-UNT-04).
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, ChevronRight } from "lucide-react";
import { api } from "@/api";
import { useAuth } from "@/app/auth";
import type { UnitSummary } from "@/api/types";
import { Page, TopBar } from "@/components/ui/shell";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/misc";
import { errorMessage } from "@/lib/http";
import { fmtRupiah } from "@/lib/format";
import { term } from "@/lib/terms";
import { setActiveUnitId, useActiveUnit } from "@/lib/active-unit";
import { cn } from "@/lib/utils";
import { UnitDetail } from "./UnitDetail";

export default function UnitsPage() {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ["my-units"], queryFn: () => api().myUnits() });
  const title = term(user, "my_unit");
  return (
    <Page className="bg-neutral-100 pb-8">
      <TopBar title={title} />
      {q.isLoading ? (
        <div className="space-y-3 p-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState icon={<Building2 size={48} />} title={`${term(user, "inventory_unit")} belum terhubung`} description="Akun Anda belum memiliki akses unit. Hubungi building management." />
      ) : q.data.length === 1 ? (
        <UnitDetail s={q.data[0]} />
      ) : (
        <UnitList units={q.data} />
      )}
    </Page>
  );
}

function UnitList({ units }: { units: UnitSummary[] }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const active = useActiveUnit(user);
  return (
    <div className="space-y-3 p-4">
      <p className="px-1 text-[12px] text-neutral-600">Anda memiliki akses ke {units.length} {term(user, "inventory_unit").toLowerCase()}. Unit aktif dipakai di Beranda dan sebagai pilihan awal formulir.</p>
      {units.map((s) => {
        const isActive = active?.id === s.unit.id;
        return (
          <section key={s.unit.id} className={cn("rounded-2xl bg-card shadow-card", isActive && "ring-2 ring-brand-500")}>
            <button type="button" onClick={() => nav(`/units/${s.unit.id}`)} className="tap flex w-full items-center gap-3 p-4 text-left">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Building2 size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-bold text-neutral-800">{s.unit.name}</span>
                  {isActive && <span className="rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">Aktif</span>}
                  {s.unit.is_primary && <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-600">Utama</span>}
                </div>
                <div className="truncate text-[11px] text-neutral-500">{s.unit.path_text}</div>
                <div className="mt-1 text-[12px] text-neutral-600">
                  {s.counts.open_requests} permintaan terbuka · {s.counts.outstanding_amount > 0 ? `tagihan ${fmtRupiah(s.counts.outstanding_amount)}` : "tanpa tunggakan"}
                </div>
              </div>
              <ChevronRight size={18} className="text-neutral-400" />
            </button>
            {!isActive && (
              <div className="border-t border-border px-4 py-2">
                <button type="button" onClick={() => setActiveUnitId(s.unit.id)} className="flex items-center gap-1.5 text-[13px] font-bold text-brand-600">
                  <CheckCircle2 size={16} /> Jadikan unit aktif
                </button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
