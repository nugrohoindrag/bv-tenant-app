// Facilities (PRD P1 v1.3 §3.6 Facility Booking; nav Facilities): daftar fasilitas property + booking saya.
// Ketersediaan slot & konflik dicegah server (EXCLUDE); persetujuan mengikuti aturan property/fasilitas.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, Clock, MapPin, Users } from "lucide-react";
import { api } from "@/api";
import type { Booking, Facility } from "@/api/types";
import { Page, TabHeader } from "@/components/ui/shell";
import { EmptyState, ErrorState, Skeleton, StatusBadge } from "@/components/ui/misc";
import { errorMessage } from "@/lib/http";
import { fmtDayShort, fmtTime } from "@/lib/terms";
import { cn } from "@/lib/utils";

export const FACILITY_TYPE: Record<string, string> = { meeting_room: "Ruang rapat", function_hall: "Function hall", gym: "Gym", pool: "Kolam renang", sports: "Olahraga", bbq: "BBQ", parking: "Parkir", other: "Fasilitas" };

export default function FacilitiesPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState<"facilities" | "bookings">("facilities");
  const facs = useQuery({ queryKey: ["facilities"], queryFn: () => api().facilities(), staleTime: 60_000 });
  const bookings = useQuery({ queryKey: ["bookings", {}], queryFn: () => api().bookings(), refetchInterval: 30_000, enabled: tab === "bookings" });

  return (
    <Page bottomNav>
      <TabHeader title="Facilities" subtitle="Booking fasilitas bersama">
        <div className="flex gap-2 px-4 pb-3">
          {(["facilities", "bookings"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={cn("rounded-full px-4 py-1.5 text-[13px] font-semibold", tab === t ? "bg-brand-600 text-white" : "bg-card text-neutral-text shadow-card")}>
              {t === "facilities" ? "Fasilitas" : "Booking saya"}
            </button>
          ))}
        </div>
      </TabHeader>
      <div className="flex flex-col gap-3 px-4 pb-4 pt-1">
        {tab === "facilities" ? (
          facs.isLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-[96px] rounded-xl" />)
          ) : facs.error ? (
            <ErrorState message={errorMessage(facs.error)} onRetry={() => facs.refetch()} />
          ) : !facs.data?.length ? (
            <EmptyState icon={<CalendarDays size={48} />} title="Belum ada fasilitas" description="Property belum membuka fasilitas untuk booking." />
          ) : (
            facs.data.map((f) => <FacilityCard key={f.id} f={f} onClick={() => nav(`/facilities/${f.id}`)} />)
          )
        ) : bookings.isLoading ? (
          [0, 1].map((i) => <Skeleton key={i} className="h-[84px] rounded-xl" />)
        ) : bookings.error ? (
          <ErrorState message={errorMessage(bookings.error)} onRetry={() => bookings.refetch()} />
        ) : !bookings.data?.length ? (
          <EmptyState icon={<CalendarDays size={48} />} title="Belum ada booking" description="Pilih fasilitas lalu tentukan tanggal & jam." />
        ) : (
          bookings.data.map((b) => <BookingCard key={b.id} b={b} onClick={() => nav(`/facilities/bookings/${b.id}`)} />)
        )}
      </div>
    </Page>
  );
}

function FacilityCard({ f, onClick }: { f: Facility; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="tap flex items-center gap-3 rounded-xl bg-card p-4 text-left shadow-card">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-purple text-white">
        <CalendarDays size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-bold text-neutral-800">{f.name}</div>
        <div className="truncate text-[11px] text-neutral-500">
          {FACILITY_TYPE[f.facility_type] ?? f.facility_type}
          {f.location_path ? ` · ${f.location_path}` : ""}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-neutral-600">
          <span className="inline-flex items-center gap-1">
            <Clock size={12} /> {f.open_time.slice(0, 5)}–{f.close_time.slice(0, 5)}
          </span>
          {f.capacity != null && (
            <span className="inline-flex items-center gap-1">
              <Users size={12} /> {f.capacity} orang
            </span>
          )}
          {f.effective_approval && <span className="rounded-md bg-warning-soft px-1.5 py-0.5 font-semibold text-warning-text">Perlu persetujuan</span>}
        </div>
      </div>
      <ChevronRight size={18} className="text-neutral-400" />
    </button>
  );
}

export function BookingCard({ b, onClick }: { b: Booking; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="tap flex items-center gap-3 rounded-xl bg-card p-4 text-left shadow-card">
      <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-brand-50 py-1.5 text-brand-700">
        <span className="text-[10px] font-semibold uppercase">{fmtDayShort(b.starts_at).split(" ")[0]}</span>
        <span className="text-[18px] font-extrabold leading-tight">{new Date(b.starts_at).getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold text-neutral-800">{b.facility_name}</div>
        <div className="text-[12px] text-neutral-500">
          {fmtTime(b.starts_at)}–{fmtTime(b.ends_at)} · {b.booking_number}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-500">
          <StatusBadge status={b.status} objectType="booking" />
          {b.purpose && <span className="truncate inline-flex items-center gap-1"><MapPin size={11} /> {b.purpose}</span>}
        </div>
      </div>
      <ChevronRight size={18} className="text-neutral-400" />
    </button>
  );
}
