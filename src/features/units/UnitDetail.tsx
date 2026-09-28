// Isi halaman My Unit (P3-UNT-02/03): identitas & lokasi, kepemilikan/hunian, tenant, penghuni terdaftar, akses area lain, ringkasan
// (permintaan terbuka, tagihan outstanding, booking & tamu mendatang, paket menunggu, izin parkir aktif) yang bertaut ke modulnya.
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Car, CheckCircle2, ClipboardList, MapPin, Package, UserRound, Wallet } from "lucide-react";
import { useAuth } from "@/app/auth";
import type { UnitSummary } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/controls";
import { Avatar } from "@/components/ui/misc";
import { hasCap } from "@/components/ui/shell";
import { fmtRupiah } from "@/lib/format";
import { OCCUPANCY_LABEL, OWNERSHIP_LABEL, PERSON_ROLE_LABEL } from "@/lib/labels";
import { setActiveUnitId, useActiveUnit } from "@/lib/active-unit";
import { term } from "@/lib/terms";
import { cn } from "@/lib/utils";

export function UnitDetail({ s }: { s: UnitSummary }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const active = useActiveUnit(user);
  const isActive = active?.id === s.unit.id;
  const multi = (user?.units.length ?? 0) > 1;
  const c = s.counts;
  const stats: { key: string; icon: ReactNode; n: ReactNode; label: string; to: string; show: boolean; tone?: string }[] = [
    { key: "req", icon: <ClipboardList size={18} />, n: c.open_requests, label: "Permintaan terbuka", to: "/requests?f=open", show: true },
    { key: "bill", icon: <Wallet size={18} />, n: c.unpaid_invoices, label: c.outstanding_amount > 0 ? fmtRupiah(c.outstanding_amount) : "Tagihan belum dibayar", to: "/bills", show: hasCap(user, "billing"), tone: c.unpaid_invoices > 0 ? "text-warning-text" : undefined },
    { key: "book", icon: <CalendarDays size={18} />, n: c.upcoming_bookings, label: "Booking mendatang", to: "/facilities?tab=bookings", show: hasCap(user, "facility_booking") },
    { key: "vis", icon: <UserRound size={18} />, n: c.upcoming_visitors, label: "Tamu mendatang", to: "/visitors", show: hasCap(user, "visitor_management") },
    { key: "pkg", icon: <Package size={18} />, n: c.packages_waiting, label: "Paket menunggu", to: "/packages", show: true, tone: c.packages_waiting > 0 ? "text-warning-text" : undefined },
    { key: "prk", icon: <Car size={18} />, n: c.active_parking_permits, label: "Izin parkir aktif", to: "/parking", show: true },
  ];
  return (
    <div className="space-y-3 p-4 fade-up">
      <section className="rounded-2xl bg-gradient-brand p-5 text-white shadow-float">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white/80">{term(user, "my_unit")}</div>
        <div className="mt-0.5 flex items-center gap-2">
          <h1 className="text-[22px] font-extrabold leading-tight">{s.unit.name}</h1>
          {multi && isActive && <span className="rounded-md bg-white/25 px-1.5 py-0.5 text-[10px] font-bold">Aktif</span>}
        </div>
        <div className="mt-1 flex items-start gap-1 text-[12px] text-white/90">
          <MapPin size={14} className="mt-0.5 shrink-0" /> {s.unit.path_text || user?.property.name}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
          {s.unit.unit_number && <Pill>No. {s.unit.unit_number}</Pill>}
          {s.unit_type && <Pill>{s.unit_type}</Pill>}
          {s.area_m2 ? <Pill>{s.area_m2.toLocaleString("id-ID")} m²</Pill> : null}
          {s.occupancy_status && <Pill>{OCCUPANCY_LABEL[s.occupancy_status] ?? s.occupancy_status}</Pill>}
          {s.ownership_status && <Pill>{OWNERSHIP_LABEL[s.ownership_status] ?? s.ownership_status}</Pill>}
        </div>
        {multi && !isActive && (
          <Button size="sm" variant="soft" className="mt-4 bg-white text-brand-700" onClick={() => setActiveUnitId(s.unit.id)}>
            <CheckCircle2 size={16} /> Jadikan unit aktif
          </Button>
        )}
      </section>

      <section className="grid grid-cols-2 gap-2">
        {stats
          .filter((x) => x.show)
          .map((x) => (
            <button key={x.key} type="button" onClick={() => nav(x.to)} className="tap flex items-center gap-3 rounded-xl bg-card p-3 text-left shadow-card">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">{x.icon}</span>
              <span className="min-w-0">
                <span className="block text-[18px] font-extrabold leading-none text-neutral-800">{x.n}</span>
                <span className={cn("mt-0.5 block truncate text-[11px] font-semibold text-neutral-500", x.tone)}>{x.label}</span>
              </span>
            </button>
          ))}
      </section>

      {s.tenant && (
        <Section title={term(user, "customer")}>
          <div className="text-[14px] font-bold text-neutral-800">{s.tenant.name}</div>
          {s.tenant.code && <div className="text-[12px] text-neutral-500">{s.tenant.code}</div>}
        </Section>
      )}

      <Section title={`${term(user, "occupant")} & pengguna`}>
        {s.people.length === 0 ? (
          <p className="text-[13px] text-neutral-500">Belum ada penghuni terdaftar untuk {term(user, "inventory_unit").toLowerCase()} ini.</p>
        ) : (
          <ul className="divide-y divide-border">
            {s.people.map((p, i) => (
              <li key={p.name + i} className="flex items-center gap-3 py-2">
                <Avatar name={p.name} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 truncate text-[14px] font-semibold text-neutral-800">
                    {p.name}
                    {p.is_self && <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">Anda</span>}
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {PERSON_ROLE_LABEL[p.role] ?? p.role}
                    {p.relation ? ` · ${OWNERSHIP_LABEL[p.relation] ?? p.relation}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {s.other_access.length > 0 && (
        <Section title="Akses area lain">
          <ul className="space-y-1 text-[13px]">
            {s.other_access.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <MapPin size={14} className="text-brand-600" /> <span className="font-semibold">{a.name}</span>
                <span className="truncate text-[11px] text-neutral-500">{a.path_text}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white/20 px-2.5 py-1">{children}</span>;
}
