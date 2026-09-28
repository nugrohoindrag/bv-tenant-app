// Detail paket (P3-PKG-02, deep link notifikasi /packages/{id}): status, lokasi penyimpanan, kurir/resi, foto, serah terima.
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock, MapPin, Truck } from "lucide-react";
import { api } from "@/api";
import { Page, TopBar } from "@/components/ui/shell";
import { ErrorState, Skeleton, StatusBadge } from "@/components/ui/misc";
import { DetailRow, Section } from "@/components/ui/controls";
import { AttachmentList } from "@/components/attachments";
import { errorMessage } from "@/lib/http";
import { fmtDateTime } from "@/lib/format";
import { PACKAGE_TYPE } from "@/lib/labels";
import { packageTitle } from "./PackagesPage";

export default function PackageDetailPage() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: ["packages", "detail", id], queryFn: () => api().package(id), refetchInterval: 60_000 });
  const p = q.data;
  const waiting = !!p && ["received", "notified"].includes(p.status);
  return (
    <Page className="bg-neutral-100 pb-8">
      <TopBar title={p?.package_number ?? "Paket"} />
      {q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !p ? (
        <div className="p-4">
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-3 p-4 fade-up">
          <Section>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase text-neutral-500">{PACKAGE_TYPE[p.package_type] ?? p.package_type}</div>
                <div className="text-[17px] font-bold leading-tight text-neutral-800">{packageTitle(p)}</div>
                <div className="text-[12px] text-neutral-500">Untuk {p.recipient_name}{p.unit_name ? ` · ${p.unit_name}` : ""}</div>
              </div>
              <StatusBadge status={p.status} objectType="package" />
            </div>
            {waiting && (
              <div className="mt-3 rounded-xl bg-warning-soft p-3 text-warning-text">
                <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase">
                  <MapPin size={14} /> Lokasi pengambilan
                </div>
                <div className="mt-0.5 text-[16px] font-bold">{p.storage_location || "Resepsionis / pos security"}</div>
                <p className="mt-1 text-[12px]">Tunjukkan nomor paket {p.package_number} saat mengambil. {p.days_waiting > 0 ? `Sudah menunggu ${p.days_waiting} hari.` : ""}</p>
              </div>
            )}
            {p.status === "returned" && p.return_reason && <p className="mt-3 rounded-md bg-neutral-100 px-3 py-2 text-[12px] text-neutral-700">Dikembalikan: {p.return_reason}</p>}
          </Section>

          <Section title="Rincian">
            <DetailRow icon={<Truck size={15} />} label="Kurir" value={p.courier} />
            <DetailRow label="Nomor resi" value={p.tracking_number} />
            <DetailRow icon={<Clock size={15} />} label="Diterima" value={fmtDateTime(p.received_at)} />
            <DetailRow label="Diberitahukan" value={p.notified_at ? fmtDateTime(p.notified_at) : null} />
            <DetailRow label="Pengingat" value={p.reminder_count > 0 ? `${p.reminder_count} kali` : null} />
            <DetailRow label="Diambil" value={p.picked_up_at ? `${fmtDateTime(p.picked_up_at)}${p.picked_up_by_name ? ` oleh ${p.picked_up_by_name}` : ""}` : null} />
            <DetailRow label="Catatan serah terima" value={p.handover_note} />
            <DetailRow label="Dikembalikan" value={p.returned_at ? fmtDateTime(p.returned_at) : null} />
          </Section>

          {p.photos.length > 0 && (
            <Section title="Foto">
              <AttachmentList items={p.photos.map((ph) => ({ id: ph.id, url: ph.url, thumb_url: ph.thumb_url, content_type: "image/jpeg" }))} size={104} />
            </Section>
          )}
        </div>
      )}
    </Page>
  );
}
