// Detail booking fasilitas: status (booking), jadwal, keperluan, alasan penolakan, batalkan sesuai allowed_actions.
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock, Users } from "lucide-react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Page, StickyFooter, TopBar } from "@/components/ui/shell";
import { ErrorState, Sheet, Skeleton, StatusBadge } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/http";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { fmtTime } from "@/lib/terms";

export default function BookingDetailPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ["bookings", id], queryFn: () => api().booking(id), refetchInterval: 30_000 });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const cancel = useMutation({
    mutationFn: () => api().cancelBooking(id, reason.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["facility-availability"] });
      setCancelOpen(false);
      toast.success("Booking dibatalkan.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const b = q.data;
  if (q.error) return <Page><TopBar title="Booking" /><ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /></Page>;
  return (
    <Page className="bg-neutral-100 pb-28">
      <TopBar title={b?.booking_number ?? "Booking"} />
      {!b ? (
        <div className="p-4"><Skeleton className="h-48" /></div>
      ) : (
        <div className="space-y-3 p-4 fade-up">
          <section className="rounded-2xl bg-card p-4 shadow-card">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-purple text-white"><CalendarDays size={22} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[17px] font-bold text-neutral-800">{b.facility_name}</div>
                <div className="mt-1"><StatusBadge status={b.status} objectType="booking" /></div>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-[13px] text-neutral-700">
              <div className="flex items-center gap-2"><CalendarDays size={15} className="text-brand-600" /> {fmtDate(b.starts_at)}</div>
              <div className="flex items-center gap-2"><Clock size={15} className="text-brand-600" /> {fmtTime(b.starts_at)} – {fmtTime(b.ends_at)}</div>
              {b.attendees != null && <div className="flex items-center gap-2"><Users size={15} className="text-brand-600" /> {b.attendees} peserta</div>}
              {b.purpose && <div className="pt-1">Keperluan: <span className="font-semibold">{b.purpose}</span></div>}
              {b.notes && <div>Catatan: {b.notes}</div>}
            </div>
            {b.status === "pending" && <p className="mt-3 rounded-md bg-warning-soft px-3 py-2 text-[12px] text-warning-text">Menunggu persetujuan building management. Anda akan mendapat notifikasi.</p>}
            {b.status === "rejected" && b.rejection_reason && <p className="mt-3 rounded-md bg-critical-soft px-3 py-2 text-[12px] text-critical-text">Ditolak: {b.rejection_reason}</p>}
            {b.status === "cancelled" && b.cancel_reason && <p className="mt-3 text-[12px] text-neutral-500">Dibatalkan: {b.cancel_reason}</p>}
            <p className="mt-3 text-[11px] text-neutral-500">Dibuat {fmtDateTime(b.created_at)}</p>
          </section>
        </div>
      )}
      {b?.allowed_actions.includes("cancel") && (
        <StickyFooter>
          <Button block variant="outline" onClick={() => setCancelOpen(true)}>Batalkan booking</Button>
        </StickyFooter>
      )}
      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title="Batalkan booking">
        <Textarea variant="box" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan (opsional)" />
        <Button block variant="danger" className="mt-4" loading={cancel.isPending} onClick={() => cancel.mutate()}>Batalkan</Button>
      </Sheet>
    </Page>
  );
}
