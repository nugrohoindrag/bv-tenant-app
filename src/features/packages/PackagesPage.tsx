// Paket (P3-PKG-02): paket yang menunggu diambil (lokasi penyimpanan menonjol) dan riwayat (diambil / dikembalikan).
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, MapPin, Package as PackageIcon } from "lucide-react";
import { api } from "@/api";
import type { Package } from "@/api/types";
import { Page, TopBar } from "@/components/ui/shell";
import { EmptyState, ErrorState, Skeleton, StatusBadge } from "@/components/ui/misc";
import { FilterTabs } from "@/components/ui/controls";
import { errorMessage } from "@/lib/http";
import { fmtRelative } from "@/lib/format";
import { PACKAGE_TYPE } from "@/lib/labels";

export function packageTitle(p: Pick<Package, "description" | "package_type" | "courier">): string {
  return p.description || `${PACKAGE_TYPE[p.package_type] ?? "Paket"}${p.courier ? ` dari ${p.courier}` : ""}`;
}

export default function PackagesPage() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") === "history" ? "history" : "waiting";
  const q = useQuery({ queryKey: ["packages", tab], queryFn: () => api().packages({ waiting: tab === "waiting" }), refetchInterval: 60_000 });
  const rows = q.data?.data ?? [];
  return (
    <Page className="bg-neutral-100 pb-8">
      <TopBar title="Paket" />
      <FilterTabs
        className="px-4 pb-1 pt-3"
        value={tab}
        onChange={(t) => setSp(t === "waiting" ? {} : { tab: t }, { replace: true })}
        options={[
          { value: "waiting", label: "Menunggu diambil" },
          { value: "history", label: "Riwayat" },
        ]}
      />
      <div className="flex flex-col gap-3 p-4">
        {q.isLoading ? (
          [0, 1].map((i) => <Skeleton key={i} className="h-[96px] rounded-xl" />)
        ) : q.error ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<PackageIcon size={48} />} title={tab === "waiting" ? "Tidak ada paket menunggu" : "Belum ada riwayat paket"} description={tab === "waiting" ? "Anda akan menerima notifikasi saat paket tiba di resepsionis/security." : undefined} />
        ) : (
          rows.map((p) => (
            <button key={p.id} type="button" onClick={() => nav(`/packages/${p.id}`)} className="tap flex items-start gap-3 rounded-xl bg-card p-4 text-left shadow-card">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-amber text-white">
                <PackageIcon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[14px] font-bold text-neutral-800">{packageTitle(p)}</span>
                  <StatusBadge status={p.status} objectType="package" className="shrink-0" />
                </div>
                <div className="truncate text-[12px] text-neutral-500">
                  Untuk {p.recipient_name} · diterima {fmtRelative(p.received_at)}
                </div>
                {["received", "notified"].includes(p.status) && p.storage_location && (
                  <div className="mt-1.5 flex items-center gap-1 rounded-md bg-warning-soft px-2 py-1 text-[12px] font-semibold text-warning-text">
                    <MapPin size={13} /> Ambil di: {p.storage_location}
                  </div>
                )}
                {["received", "notified"].includes(p.status) && p.days_waiting > 0 && <div className="mt-1 text-[11px] text-neutral-500">Menunggu {p.days_waiting} hari</div>}
              </div>
              <ChevronRight size={18} className="mt-3 text-neutral-400" />
            </button>
          ))
        )}
      </div>
    </Page>
  );
}
