// Detail izin parkir (P3-PRK-02; deep link notifikasi /parking/permits/{id}): status, masa berlaku, stiker, area, tarif, alasan
// keputusan; batalkan selama masih diajukan (allowed_actions `cancel`).
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Car, MapPin, Ticket } from "lucide-react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { DetailRow, Section } from "@/components/ui/controls";
import { Page, StickyFooter, TopBar } from "@/components/ui/shell";
import { Dialog, ErrorState, Skeleton, StatusBadge } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/http";
import { fmtDateTime, fmtRupiah } from "@/lib/format";
import { PERMIT_TYPE, VEHICLE_TYPE } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { permitValidity } from "./ParkingPage";

export default function PermitDetailPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ["parking-permit", id], queryFn: () => api().permit(id), refetchInterval: 60_000 });
  const [confirm, setConfirm] = useState(false);
  const cancel = useMutation({
    mutationFn: () => api().cancelPermit(id),
    onSuccess: (p) => {
      qc.setQueryData(["parking-permit", id], p);
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["parking-permits"] });
      setConfirm(false);
      toast.success("Permohonan izin dibatalkan.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const p = q.data;
  return (
    <Page className="bg-neutral-100 pb-28">
      <TopBar title={p?.permit_number ?? "Izin Parkir"} />
      {q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !p ? (
        <div className="p-4">
          <Skeleton className="h-60 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-3 p-4 fade-up">
          <section className={cn("rounded-2xl p-5 shadow-card", p.is_active ? "bg-gradient-brand text-white" : "bg-card")}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className={cn("text-[11px] font-semibold uppercase", p.is_active ? "text-white/80" : "text-neutral-500")}>Izin parkir {PERMIT_TYPE[p.permit_type] ?? p.permit_type}</div>
                <div className="font-mono text-[24px] font-extrabold tracking-wide">{p.plate_number}</div>
                <div className={cn("text-[12px]", p.is_active ? "text-white/90" : "text-neutral-500")}>{[VEHICLE_TYPE[p.vehicle_type] ?? p.vehicle_type, p.vehicle_label].filter(Boolean).join(" · ")}</div>
              </div>
              <StatusBadge status={p.status} objectType="parking_permit" className={p.is_active ? "bg-white text-success-text" : undefined} />
            </div>
            {p.sticker_number && (
              <div className={cn("mt-4 rounded-xl px-3 py-2", p.is_active ? "bg-white/20" : "bg-neutral-100")}>
                <div className="text-[11px] font-semibold uppercase opacity-80">Nomor stiker</div>
                <div className="font-mono text-[20px] font-extrabold tracking-widest">{p.sticker_number}</div>
              </div>
            )}
            <div className={cn("mt-3 flex items-center gap-1.5 text-[13px] font-semibold", !p.is_active && "text-neutral-700")}>
              <Calendar size={15} /> {permitValidity(p)}
            </div>
          </section>

          {p.status === "requested" && <p className="rounded-xl bg-warning-soft px-4 py-3 text-[13px] text-warning-text">Permohonan sedang ditinjau Security/Building Management. Anda akan mendapat notifikasi saat diputuskan.</p>}
          {["rejected", "revoked"].includes(p.status) && p.decision_reason && <p className="rounded-xl bg-critical-soft px-4 py-3 text-[13px] text-critical-text">{p.status === "rejected" ? "Ditolak" : "Dicabut"}: {p.decision_reason}</p>}

          <Section title="Rincian">
            <DetailRow icon={<Ticket size={15} />} label="Nomor izin" value={p.permit_number} />
            <DetailRow icon={<MapPin size={15} />} label="Area parkir" value={p.parking_area_name ?? "Ditentukan pengelola"} />
            <DetailRow icon={<Car size={15} />} label="Unit" value={p.unit_name} />
            <DetailRow label="Tarif" value={p.fee_amount != null ? `${fmtRupiah(p.fee_amount)} / ${p.permit_type === "annual" ? "tahun" : "bulan"}` : null} />
            <DetailRow label="Diajukan" value={`${fmtDateTime(p.requested_at)}${p.requested_by_name ? ` oleh ${p.requested_by_name}` : ""}`} />
            <DetailRow label="Diputuskan" value={p.decided_at ? fmtDateTime(p.decided_at) : null} />
            <DetailRow label="Catatan" value={p.notes} />
          </Section>
        </div>
      )}
      {p?.allowed_actions.includes("cancel") && (
        <StickyFooter>
          <Button block variant="outline" onClick={() => setConfirm(true)}>
            Batalkan permohonan
          </Button>
        </StickyFooter>
      )}
      <Dialog open={confirm} onClose={() => setConfirm(false)} title="Batalkan permohonan izin?">
        <p className="text-[14px] text-neutral-700">Permohonan yang dibatalkan tidak dapat dipulihkan; Anda dapat mengajukan ulang kapan saja.</p>
        <div className="mt-4 flex gap-2">
          <Button block variant="outline" onClick={() => setConfirm(false)}>
            Tidak
          </Button>
          <Button block variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate()}>
            Batalkan
          </Button>
        </div>
      </Dialog>
    </Page>
  );
}
