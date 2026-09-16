// Booking fasilitas (PRD §3.6): pilih tanggal → slot ketersediaan dari server → durasi (min/max) → keperluan → kirim.
// Booking dibuat idempoten; konflik → 409 dari server (bukan validasi UI).
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Info, Users } from "lucide-react";
import { api } from "@/api";
import type { Slot } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { Page, StickyFooter, TopBar } from "@/components/ui/shell";
import { ErrorState, Skeleton } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/http";
import { fmtTime } from "@/lib/terms";
import { cn } from "@/lib/utils";
import { FACILITY_TYPE } from "./FacilitiesPage";

const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function FacilityBookingPage() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const facs = useQuery({ queryKey: ["facilities"], queryFn: () => api().facilities(), staleTime: 60_000 });
  const f = facs.data?.find((x) => x.id === id);
  const days = useMemo(() => Array.from({ length: Math.min(14, f?.advance_booking_days ?? 14) + 1 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); d.setHours(0, 0, 0, 0); return d; }), [f?.advance_booking_days]);
  const [date, setDate] = useState(isoDate(new Date()));
  const [start, setStart] = useState<Slot | null>(null);
  const [slotsN, setSlotsN] = useState(1);
  const [attendees, setAttendees] = useState("");
  const [purpose, setPurpose] = useState("");
  const slots = useQuery({ queryKey: ["facility-availability", id, date], queryFn: () => api().facilityAvailability(id, date), enabled: !!id });
  const slotMin = f?.slot_minutes ?? 60;
  const minN = Math.max(1, Math.ceil((f?.min_duration_minutes ?? slotMin) / slotMin));
  const maxN = Math.max(minN, Math.floor((f?.max_duration_minutes ?? slotMin) / slotMin));
  // slot berurutan yang tersedia mulai dari slot terpilih
  const startIdx = start ? (slots.data ?? []).findIndex((s) => s.starts_at === start.starts_at) : -1;
  const contiguous = startIdx >= 0 ? (slots.data ?? []).slice(startIdx).findIndex((s) => !s.available) : 0;
  const maxAvail = startIdx >= 0 ? (contiguous === -1 ? (slots.data ?? []).length - startIdx : contiguous) : 0;
  const n = Math.min(slotsN, Math.max(maxAvail, 0));
  const end = start && n > 0 ? (slots.data ?? [])[startIdx + n - 1]?.ends_at : null;
  const weekdayClosed = f && !f.weekdays.includes(new Date(date + "T00:00:00").getDay());

  const create = useMutation({
    mutationFn: () => api().createBooking({ facility_id: id, starts_at: start!.starts_at, ends_at: end!, attendees: attendees ? Number(attendees) : null, purpose: purpose.trim() || null }),
    onSuccess: (b) => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["facility-availability"] });
      toast.success(b.status === "pending" ? "Booking dikirim, menunggu persetujuan." : "Booking dikonfirmasi.");
      nav(`/facilities/bookings/${b.id}`, { replace: true });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (facs.error) return <Page><TopBar title="Booking" /><ErrorState message={errorMessage(facs.error)} onRetry={() => facs.refetch()} /></Page>;
  if (!f) return <Page><TopBar title="Booking" /><div className="p-4"><Skeleton className="h-40" /></div></Page>;

  return (
    <Page className="pb-32">
      <TopBar title={f.name} />
      <div className="px-4 pt-4">
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <div className="text-[11px] font-semibold uppercase text-neutral-500">{FACILITY_TYPE[f.facility_type] ?? f.facility_type}{f.location_path ? ` · ${f.location_path}` : ""}</div>
          {f.description && <p className="mt-1 text-[13px] text-neutral-700">{f.description}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-neutral-600">
            <span className="inline-flex items-center gap-1"><Clock size={13} /> {f.open_time.slice(0, 5)}–{f.close_time.slice(0, 5)} · slot {slotMin} mnt · {f.min_duration_minutes}–{f.max_duration_minutes} mnt</span>
            {f.capacity != null && <span className="inline-flex items-center gap-1"><Users size={13} /> maks {f.capacity} orang</span>}
          </div>
          {f.rules && <p className="mt-2 flex items-start gap-1 text-[12px] text-neutral-600"><Info size={13} className="mt-0.5 shrink-0" /> {f.rules}</p>}
          {f.effective_approval && <p className="mt-2 rounded-md bg-warning-soft px-2 py-1 text-[12px] font-semibold text-warning-text">Booking fasilitas ini memerlukan persetujuan building management.</p>}
        </div>

        <h2 className="mb-2 mt-5 text-[15px] font-bold">Tanggal</h2>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {days.map((d) => {
            const v = isoDate(d);
            const closed = !f.weekdays.includes(d.getDay());
            return (
              <button key={v} type="button" disabled={closed} onClick={() => { setDate(v); setStart(null); }} className={cn("flex w-14 shrink-0 flex-col items-center rounded-xl py-2 disabled:opacity-40", date === v ? "bg-brand-600 text-white" : "bg-card text-neutral-700 shadow-card")}>
                <span className="text-[10px] font-semibold uppercase">{d.toLocaleDateString("id-ID", { weekday: "short" })}</span>
                <span className="text-[18px] font-extrabold leading-tight">{d.getDate()}</span>
                <span className="text-[10px]">{d.toLocaleDateString("id-ID", { month: "short" })}</span>
              </button>
            );
          })}
        </div>

        <h2 className="mb-2 mt-5 text-[15px] font-bold">Jam mulai</h2>
        {weekdayClosed ? (
          <p className="text-[13px] text-neutral-500">Fasilitas tutup pada hari ini.</p>
        ) : slots.isLoading ? (
          <Skeleton className="h-24" />
        ) : slots.error ? (
          <ErrorState message={errorMessage(slots.error)} onRetry={() => slots.refetch()} />
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {(slots.data ?? []).map((s) => (
              <button key={s.starts_at} type="button" disabled={!s.available} onClick={() => { setStart(s); setSlotsN(minN); }} className={cn("rounded-lg py-2 text-[13px] font-semibold disabled:line-through disabled:opacity-40", start?.starts_at === s.starts_at ? "bg-brand-600 text-white" : "bg-card text-neutral-700 shadow-card")}>
                {fmtTime(s.starts_at)}
              </button>
            ))}
            {(slots.data ?? []).length === 0 && <p className="col-span-4 text-[13px] text-neutral-500">Tidak ada slot pada tanggal ini.</p>}
          </div>
        )}

        {start && (
          <>
            <h2 className="mb-2 mt-5 text-[15px] font-bold">Durasi</h2>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: Math.max(0, Math.min(maxN, maxAvail) - minN + 1) }, (_, i) => minN + i).map((k) => (
                <button key={k} type="button" onClick={() => setSlotsN(k)} className={cn("rounded-full px-4 py-1.5 text-[13px] font-semibold", n === k ? "bg-brand-600 text-white" : "bg-card text-neutral-700 shadow-card")}>
                  {(k * slotMin) / 60 >= 1 ? `${(k * slotMin) / 60} jam` : `${k * slotMin} mnt`}
                </button>
              ))}
              {maxAvail < minN && <p className="text-[13px] text-critical">Slot berurutan tidak cukup untuk durasi minimal ({f.min_duration_minutes} mnt).</p>}
            </div>
            {end && <p className="mt-2 text-[13px] text-neutral-600">{fmtTime(start.starts_at)} – {fmtTime(end)}</p>}
            <div className="mt-4 space-y-3">
              <Input variant="box" label="Jumlah peserta" type="number" min={1} max={f.capacity ?? undefined} value={attendees} onChange={(e) => setAttendees(e.target.value)} />
              <Textarea variant="box" label="Keperluan" rows={2} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="mis. rapat warga" />
            </div>
          </>
        )}
      </div>
      <StickyFooter>
        <Button block size="lg" disabled={!start || !end || n < minN} loading={create.isPending} onClick={() => create.mutate()}>
          {f.effective_approval ? "Ajukan Booking" : "Booking Sekarang"}
        </Button>
      </StickyFooter>
    </Page>
  );
}
