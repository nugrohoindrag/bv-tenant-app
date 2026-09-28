// Parkir tenant (P3-PRK-01..03, di atas entitas P2): kendaraan saya + izin/stiker parkir (status, masa berlaku, stiker).
// Daftar izin dari GET /tenant/parking-permits (seluruh izin kendaraan yang terlihat akun ini, terbaru dulu).
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bike, Car, ChevronRight, FileCheck2, Plus, Ticket } from "lucide-react";
import { api } from "@/api";
import type { ParkingPermit, Vehicle } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Page, TopBar } from "@/components/ui/shell";
import { EmptyState, ErrorState, Skeleton, StatusBadge } from "@/components/ui/misc";
import { errorMessage } from "@/lib/http";
import { fmtDate } from "@/lib/format";
import { PERMIT_TYPE, VEHICLE_TYPE } from "@/lib/labels";

export function permitValidity(p: Pick<ParkingPermit, "valid_from" | "valid_until">): string {
  if (p.valid_from && p.valid_until) return `${fmtDate(p.valid_from)} – ${fmtDate(p.valid_until)}`;
  if (p.valid_from) return `Mulai ${fmtDate(p.valid_from)}`;
  if (p.valid_until) return `Sampai ${fmtDate(p.valid_until)}`;
  return "Masa berlaku ditentukan pengelola";
}

/** Kendaraan boleh mengajukan izin bila tidak ada permohonan berjalan atau izin aktif (aturan server PERMIT_EXISTS). */
export function canRequestPermit(v: Vehicle): boolean {
  return !v.permits.some((p) => p.status === "requested" || (p.status === "approved" && p.is_active));
}

export default function ParkingPage() {
  const nav = useNavigate();
  const q = useQuery({ queryKey: ["vehicles"], queryFn: () => api().vehicles(), refetchInterval: 60_000 });
  const pq = useQuery({ queryKey: ["parking-permits"], queryFn: () => api().parkingPermits(), refetchInterval: 60_000 });
  const vehicles = q.data ?? [];
  const permits = pq.data ?? [];
  return (
    <Page className="bg-neutral-100 pb-8">
      <TopBar title="Parkir" right={<button type="button" aria-label="Tambah kendaraan" onClick={() => nav("/parking/vehicles/new")} className="tap p-2 text-brand-600"><Plus size={22} /></button>} />
      <div className="space-y-3 p-4">
        {q.isLoading ? (
          [0, 1].map((i) => <Skeleton key={i} className="h-[92px] rounded-xl" />)
        ) : q.error ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : vehicles.length === 0 ? (
          <EmptyState icon={<Car size={48} />} title="Belum ada kendaraan" description="Daftarkan kendaraan unit Anda, lalu ajukan izin/stiker parkir ke pengelola." action={<Button onClick={() => nav("/parking/vehicles/new")}>Daftarkan kendaraan</Button>} />
        ) : (
          <>
            <h2 className="px-1 text-[13px] font-bold uppercase text-neutral-500">Kendaraan saya</h2>
            {vehicles.map((v) => (
              <VehicleCard key={v.id} v={v} onOpen={() => nav(`/parking/vehicles/${v.id}`)} onRequest={() => nav(`/parking/permits/new?vehicle=${v.id}`)} />
            ))}
            <h2 className="px-1 pt-2 text-[13px] font-bold uppercase text-neutral-500">Izin parkir</h2>
            {pq.isLoading ? (
              <Skeleton className="h-[76px] rounded-xl" />
            ) : pq.error ? (
              <ErrorState message={errorMessage(pq.error)} onRetry={() => pq.refetch()} />
            ) : permits.length === 0 ? (
              <p className="rounded-xl bg-card p-4 text-[13px] text-neutral-500 shadow-card">Belum ada permohonan izin parkir.</p>
            ) : (
              permits.map((p) => (
                <button key={p.id} type="button" onClick={() => nav(`/parking/permits/${p.id}`)} className="tap flex items-center gap-3 rounded-xl bg-card p-4 text-left shadow-card">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Ticket size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-bold text-neutral-800">{p.plate_number}</span>
                      <StatusBadge status={p.status} objectType="parking_permit" />
                    </div>
                    <div className="truncate text-[12px] text-neutral-500">
                      {p.permit_number} · {PERMIT_TYPE[p.permit_type] ?? p.permit_type}
                      {p.sticker_number ? ` · stiker ${p.sticker_number}` : ""}
                    </div>
                    <div className="text-[11px] text-neutral-500">{permitValidity(p)}</div>
                  </div>
                  <ChevronRight size={18} className="text-neutral-400" />
                </button>
              ))
            )}
          </>
        )}
      </div>
    </Page>
  );
}

function VehicleCard({ v, onOpen, onRequest }: { v: Vehicle; onOpen: () => void; onRequest: () => void }) {
  const latest = v.permits[0];
  const Icon = v.vehicle_type === "motorcycle" || v.vehicle_type === "bicycle" ? Bike : Car;
  return (
    <section className="rounded-xl bg-card shadow-card">
      <button type="button" onClick={onOpen} className="tap flex w-full items-center gap-3 p-4 text-left">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-sky text-white">
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[16px] font-extrabold tracking-wide text-neutral-800">{v.plate_number}</div>
          <div className="truncate text-[12px] text-neutral-500">{[VEHICLE_TYPE[v.vehicle_type] ?? v.vehicle_type, v.brand, v.color].filter(Boolean).join(" · ")}{v.unit_name ? ` · ${v.unit_name}` : ""}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
            {v.permit_valid ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-success-soft px-1.5 py-0.5 font-semibold text-success-text">
                <FileCheck2 size={12} /> Izin aktif{v.permit_until ? ` s.d. ${fmtDate(v.permit_until)}` : ""}
              </span>
            ) : latest ? (
              <StatusBadge status={latest.status} objectType="parking_permit" />
            ) : (
              <span className="text-neutral-500">Belum ada izin parkir</span>
            )}
            {v.document_count > 0 && <span className="text-neutral-500">STNK terlampir</span>}
          </div>
        </div>
        <ChevronRight size={18} className="text-neutral-400" />
      </button>
      {canRequestPermit(v) && (
        <div className="border-t border-border px-4 py-2">
          <button type="button" onClick={onRequest} className="flex items-center gap-1.5 text-[13px] font-bold text-brand-600">
            <Ticket size={15} /> Ajukan izin parkir
          </button>
        </div>
      )}
    </section>
  );
}
