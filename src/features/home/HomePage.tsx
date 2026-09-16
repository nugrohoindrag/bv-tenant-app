// Home (PRD P1 v1.3 §27 Tenant Dashboard "Situation → Priority → Action"): sapaan + unit, CTA Report an Issue,
// My Requests (ringkasan status tenant-facing), Upcoming (booking/tamu), Payment (jatuh tempo), pengumuman.
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, Megaphone, Siren, UserRoundPlus, Wallet } from "lucide-react";
import { api } from "@/api";
import { useAuth } from "@/app/auth";
import { HeaderActions, Page, SectionTitle, hasCap } from "@/components/ui/shell";
import { Skeleton, StatusBadge } from "@/components/ui/misc";
import { HomeSkyline, Logo } from "@/components/illustrations";
import { CategoryIcon } from "@/components/category-icon";
import { fmtDate, fmtRupiah } from "@/lib/format";
import { fmtDayShort, fmtTime, greeting, term } from "@/lib/terms";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const canBook = hasCap(user, "facility_booking");
  const canVisit = hasCap(user, "visitor_management");
  const canBill = hasCap(user, "billing");
  const open = useQuery({ queryKey: ["service-requests", { open: true }], queryFn: () => api().serviceRequests({ open: true }), refetchInterval: 30_000 });
  const bills = useQuery({ queryKey: ["bills", "summary"], queryFn: () => api().billSummary(), enabled: canBill });
  const bookings = useQuery({ queryKey: ["bookings", { upcoming: true }], queryFn: () => api().bookings({ upcoming: true }), enabled: canBook });
  const visitors = useQuery({ queryKey: ["visitors", { upcoming: true }], queryFn: () => api().visitors({ upcoming: true }), enabled: canVisit });
  const ann = useQuery({ queryKey: ["announcements"], queryFn: () => api().announcements() });

  const reqs = open.data?.data ?? [];
  const inProgress = reqs.filter((r) => ["received", "being_assigned", "in_progress", "submitted"].includes(r.tenant_status)).length;
  const needResp = reqs.filter((r) => r.tenant_status === "need_your_response").length;
  const toConfirm = reqs.filter((r) => r.tenant_status === "resolved").length;
  const upcoming = [
    ...(bookings.data ?? []).map((b) => ({ id: "b-" + b.id, at: b.starts_at, title: b.facility_name, sub: `${fmtDayShort(b.starts_at)} ${fmtTime(b.starts_at)}–${fmtTime(b.ends_at)}`, status: b.status, type: "booking" as const, to: `/facilities/bookings/${b.id}` })),
    ...(visitors.data ?? []).map((v) => ({ id: "v-" + v.id, at: v.expected_at, title: `Tamu: ${v.visitor_name}`, sub: `${fmtDayShort(v.expected_at)} ${fmtTime(v.expected_at)}`, status: v.status, type: "visitor" as const, to: `/visitors/${v.id}` })),
  ]
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(0, 3);

  return (
    <Page bottomNav className="pb-6">
      {/* Situation: sapaan + unit */}
      <div className="relative overflow-hidden bg-gradient-brand pb-6 pt-safe text-white">
        <HomeSkyline className="opacity-[0.12] mix-blend-luminosity" />
        <div className="relative z-10 flex items-center gap-3 px-4 pt-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-card">
            <Logo size={32} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] text-white/85">{greeting()},</div>
            <div className="truncate text-[20px] font-bold leading-tight">{user?.full_name}</div>
          </div>
          <HeaderActions light />
        </div>
        <div className="relative z-10 mx-4 mt-4 rounded-xl bg-white/15 px-4 py-3 backdrop-blur">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/80">{term(user, "my_unit")}</div>
          <div className="text-[16px] font-bold">{user?.primary_unit?.name ?? "—"}</div>
          <div className="truncate text-[12px] text-white/85">{user?.property?.name}</div>
        </div>
        {/* Action: primary CTA */}
        <button type="button" onClick={() => nav("/report")} className="tap relative z-10 mx-4 mt-4 flex h-[56px] w-[calc(100%-32px)] items-center justify-center gap-2 rounded-full bg-white text-[17px] font-bold text-brand-700 shadow-float">
          <Siren size={22} /> Report an Issue
        </button>
      </div>

      {/* Priority: My Requests */}
      <section className="px-4 pt-5">
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-bold">My Requests</h2>
            <button type="button" className="text-[13px] font-semibold text-brand-600" onClick={() => nav("/requests")}>
              Lihat semua
            </button>
          </div>
          {open.isLoading ? (
            <Skeleton className="mt-3 h-14" />
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat n={inProgress} label="Diproses" tone="info" onClick={() => nav("/requests?f=open")} />
              <Stat n={needResp} label="Butuh respons" tone="warning" onClick={() => nav("/requests?f=need_response")} />
              <Stat n={toConfirm} label="Perlu konfirmasi" tone="success" onClick={() => nav("/requests?f=resolved")} />
            </div>
          )}
          {reqs.slice(0, 2).map((r) => (
            <button key={r.id} type="button" onClick={() => nav(`/requests/${r.id}`)} className="tap mt-3 flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left">
              <CategoryIcon icon={r.category_icon ?? r.category_code} size={34} color="#f5b335" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold">{r.title}</div>
                <div className="truncate text-[11px] text-neutral-500">
                  {r.request_number} · {r.location.name ?? "—"}
                </div>
              </div>
              <StatusBadge status={r.tenant_status} />
            </button>
          ))}
        </div>
      </section>

      {/* Quick actions */}
      <section className="mt-4 grid grid-cols-3 gap-3 px-4">
        {canBook && <Quick icon={CalendarDays} label="Booking Fasilitas" color="bg-accent-purple" onClick={() => nav("/facilities")} />}
        {canVisit && <Quick icon={UserRoundPlus} label="Daftarkan Tamu" color="bg-accent-sky" onClick={() => nav("/visitors/new")} />}
        {canBill && <Quick icon={Wallet} label="Bayar Tagihan" color="bg-accent-pink" onClick={() => nav("/bills")} />}
      </section>

      {/* Upcoming */}
      {(canBook || canVisit) && (
        <section className="pt-6">
          <SectionTitle title="Upcoming" subtitle="Booking fasilitas & tamu yang akan datang" />
          <div className="mx-4 rounded-2xl bg-card shadow-card">
            {bookings.isLoading || visitors.isLoading ? (
              <Skeleton className="m-4 h-12" />
            ) : upcoming.length === 0 ? (
              <p className="p-4 text-[13px] text-neutral-500">Tidak ada jadwal mendatang.</p>
            ) : (
              upcoming.map((u) => (
                <button key={u.id} type="button" onClick={() => nav(u.to)} className="tap flex w-full items-center gap-3 border-b border-border p-4 text-left last:border-b-0">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white", u.type === "booking" ? "bg-accent-purple" : "bg-accent-sky")}>{u.type === "booking" ? <CalendarDays size={18} /> : <UserRoundPlus size={18} />}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold">{u.title}</div>
                    <div className="text-[12px] text-neutral-500">{u.sub}</div>
                  </div>
                  <StatusBadge status={u.status} objectType={u.type} />
                </button>
              ))
            )}
          </div>
        </section>
      )}

      {/* Payment */}
      {canBill && (
        <section className="pt-6">
          <SectionTitle title="Payment" />
          <button type="button" onClick={() => nav("/bills")} className="tap mx-4 flex w-[calc(100%-32px)] items-center gap-3 rounded-2xl bg-card p-4 text-left shadow-card">
            <Wallet className="text-brand-600" size={26} />
            <div className="min-w-0 flex-1">
              {bills.isLoading ? (
                <Skeleton className="h-6 w-28" />
              ) : bills.data && bills.data.unpaid_count > 0 ? (
                <>
                  <div className="text-[18px] font-bold text-neutral-800">{fmtRupiah(bills.data.outstanding_amount)}</div>
                  <div className={cn("text-[12px]", bills.data.overdue_count > 0 ? "font-semibold text-critical" : "text-neutral-500")}>
                    {bills.data.overdue_count > 0 ? `${bills.data.overdue_count} tagihan jatuh tempo` : bills.data.next_due_at ? `Jatuh tempo ${fmtDate(bills.data.next_due_at)}` : `${bills.data.unpaid_count} tagihan belum dibayar`}
                  </div>
                </>
              ) : (
                <div className="text-[14px] font-semibold text-success-text">Tidak ada tagihan tertunggak</div>
              )}
            </div>
            <ChevronRight size={18} className="text-neutral-400" />
          </button>
        </section>
      )}

      {/* Announcements */}
      <section className="pt-6">
        <SectionTitle title="Pengumuman" subtitle="Informasi dari building management" action="Lihat semua" onAction={() => nav("/inbox?tab=announcements")} />
        <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-4">
          {ann.isLoading
            ? [0, 1].map((i) => <Skeleton key={i} className="h-[150px] w-[260px] shrink-0 rounded-2xl" />)
            : (ann.data?.data ?? []).slice(0, 5).map((a) => (
                <button key={a.id} type="button" onClick={() => nav(`/inbox/announcements/${a.id}`)} className="tap relative h-[150px] w-[260px] shrink-0 snap-start overflow-hidden rounded-2xl bg-neutral-800 text-left shadow-card">
                  {a.image_url ? <img src={a.image_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="h-full w-full bg-gradient-brand" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-white/80">
                      <Megaphone size={12} /> {a.importance === "important" || a.importance === "urgent" ? "Penting" : "Info"}
                    </div>
                    <div className="line-clamp-2 text-[15px] font-bold leading-tight">{a.title}</div>
                  </div>
                </button>
              ))}
          {!ann.isLoading && (ann.data?.data ?? []).length === 0 && <p className="px-1 text-[13px] text-neutral-500">Belum ada pengumuman.</p>}
        </div>
      </section>
    </Page>
  );
}

function Stat({ n, label, tone, onClick }: { n: number; label: string; tone: "info" | "warning" | "success"; onClick: () => void }) {
  const cls = { info: "bg-brand-50 text-brand-700", warning: "bg-warning-soft text-warning-text", success: "bg-success-soft text-success-text" }[tone];
  return (
    <button type="button" onClick={onClick} className={cn("tap rounded-xl px-2 py-2.5 text-center", cls)}>
      <div className="text-[22px] font-extrabold leading-none">{n}</div>
      <div className="mt-1 text-[11px] font-semibold">{label}</div>
    </button>
  );
}

function Quick({ icon: I, label, color, onClick }: { icon: typeof Wallet; label: string; color: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="tap flex flex-col items-center gap-2 rounded-2xl bg-card p-3 shadow-card">
      <span className={cn("flex h-12 w-12 items-center justify-center rounded-full text-white", color)}>
        <I size={24} />
      </span>
      <span className="text-center text-[12px] font-semibold leading-tight text-neutral-700">{label}</span>
    </button>
  );
}
