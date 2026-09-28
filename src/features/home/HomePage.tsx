// Home (PRD P1 v1.3 §27 Tenant Dashboard "Situation → Priority → Action"; PRD P3 v2.1 P3-APP-02/03): sapaan + unit aktif (ganti
// unit bila punya beberapa, P3-UNT-04), CTA Report an Issue, My Requests, quick action (Tamu, Paket, Parkir, Booking Fasilitas,
// Tagihan, Masukan — D-P3-01), ajakan push (P3-PSH-01), Upcoming, Payment, pengumuman (kategori/severity, P3-ANN-06).
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, Car, CheckCircle2, ChevronRight, Megaphone, MessageSquareText, Package, Siren, UserRoundPlus, Wallet } from "lucide-react";
import { api } from "@/api";
import { useAuth } from "@/app/auth";
import { HeaderActions, Page, SectionTitle, hasCap } from "@/components/ui/shell";
import { Sheet, Skeleton, StatusBadge } from "@/components/ui/misc";
import { HomeSkyline, Logo } from "@/components/illustrations";
import { CategoryIcon } from "@/components/category-icon";
import { PushBanner } from "@/components/push-card";
import { fmtDate, fmtRupiah } from "@/lib/format";
import { fmtDayShort, fmtTime, greeting, term } from "@/lib/terms";
import { ANNOUNCEMENT_CATEGORY, announcementTone } from "@/lib/labels";
import { setActiveUnitId, useActiveUnit } from "@/lib/active-unit";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const unit = useActiveUnit(user);
  const [switching, setSwitching] = useState(false);
  const canBook = hasCap(user, "facility_booking");
  const canVisit = hasCap(user, "visitor_management");
  const canBill = hasCap(user, "billing");
  const open = useQuery({ queryKey: ["service-requests", { open: true }], queryFn: () => api().serviceRequests({ open: true }), refetchInterval: 30_000 });
  const bills = useQuery({ queryKey: ["bills", "summary"], queryFn: () => api().billSummary(), enabled: canBill });
  const bookings = useQuery({ queryKey: ["bookings", { upcoming: true }], queryFn: () => api().bookings({ upcoming: true }), enabled: canBook });
  const visitors = useQuery({ queryKey: ["visitors", { upcoming: true }], queryFn: () => api().visitors({ upcoming: true }), enabled: canVisit });
  const packages = useQuery({ queryKey: ["packages", "waiting"], queryFn: () => api().packages({ waiting: true }), refetchInterval: 60_000 });
  const ann = useQuery({ queryKey: ["announcements", "list", ""], queryFn: () => api().announcements() });

  const reqs = open.data?.data ?? [];
  const inProgress = reqs.filter((r) => ["received", "being_assigned", "in_progress", "submitted"].includes(r.tenant_status)).length;
  const needResp = reqs.filter((r) => r.tenant_status === "need_your_response").length;
  const toConfirm = reqs.filter((r) => r.tenant_status === "resolved").length;
  const waitingPkgs = packages.data?.data.length ?? 0;
  const upcoming = [
    ...(bookings.data ?? []).map((b) => ({ id: "b-" + b.id, at: b.starts_at, title: b.facility_name, sub: `${fmtDayShort(b.starts_at)} ${fmtTime(b.starts_at)}–${fmtTime(b.ends_at)}`, status: b.status, type: "booking" as const, to: `/facilities/bookings/${b.id}` })),
    ...(visitors.data ?? []).map((v) => ({ id: "v-" + v.id, at: v.expected_at, title: `Tamu: ${v.visitor_name}`, sub: `${fmtDayShort(v.expected_at)} ${fmtTime(v.expected_at)}`, status: v.status, type: "visitor" as const, to: `/visitors/${v.id}` })),
  ]
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(0, 3);
  const quick = [
    canVisit && { key: "vis", icon: UserRoundPlus, label: "Tamu", color: "bg-accent-sky", to: "/visitors" },
    { key: "pkg", icon: Package, label: "Paket", color: "bg-accent-amber", to: "/packages", badge: waitingPkgs },
    { key: "prk", icon: Car, label: "Parkir", color: "bg-brand-600", to: "/parking" },
    canBook && { key: "book", icon: CalendarDays, label: "Booking Fasilitas", color: "bg-accent-purple", to: "/facilities" },
    canBill && { key: "bill", icon: Wallet, label: "Tagihan", color: "bg-accent-pink", to: "/bills" },
    { key: "fdb", icon: MessageSquareText, label: "Masukan", color: "bg-neutral-800", to: "/feedback" },
  ].filter(Boolean) as { key: string; icon: typeof Wallet; label: string; color: string; to: string; badge?: number }[];
  const multiUnit = (user?.units.length ?? 0) > 1;

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
        <div className="relative z-10 mx-4 mt-4 flex items-center gap-2 rounded-xl bg-white/15 px-4 py-3 backdrop-blur">
          <button type="button" onClick={() => nav("/units")} className="tap min-w-0 flex-1 text-left">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-white/80">{term(user, "my_unit")}</div>
            <div className="truncate text-[16px] font-bold">{unit?.name ?? "—"}</div>
            <div className="truncate text-[12px] text-white/85">{user?.property?.name}</div>
          </button>
          {multiUnit ? (
            <button type="button" onClick={() => setSwitching(true)} className="tap shrink-0 rounded-full bg-white/25 px-3 py-1.5 text-[12px] font-bold">
              Ganti
            </button>
          ) : (
            <ChevronRight size={18} className="shrink-0 text-white/80" />
          )}
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

      {/* Quick actions (D-P3-01: Tamu, Paket, Parkir dari Home) */}
      <section className="mt-4 grid grid-cols-3 gap-3 px-4">
        {quick.map((q) => (
          <Quick key={q.key} icon={q.icon} label={q.label} color={q.color} badge={q.badge} onClick={() => nav(q.to)} />
        ))}
      </section>

      <PushBanner className="px-4 pt-4" />

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

      {/* Announcements (kategori & severity; alert menonjol) */}
      <section className="pt-6">
        <SectionTitle title="Pengumuman" subtitle="Informasi dari building management" action="Lihat semua" onAction={() => nav("/inbox?tab=announcements")} />
        <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-4">
          {ann.isLoading
            ? [0, 1].map((i) => <Skeleton key={i} className="h-[150px] w-[260px] shrink-0 rounded-2xl" />)
            : (ann.data?.data ?? []).slice(0, 5).map((a) => {
                const tone = announcementTone(a);
                return (
                  <button key={a.id} type="button" onClick={() => nav(`/inbox/announcements/${a.id}`)} className={cn("tap relative h-[150px] w-[260px] shrink-0 snap-start overflow-hidden rounded-2xl bg-neutral-800 text-left shadow-card", tone === "critical" && "ring-2 ring-critical", tone === "warning" && a.category === "alert" && "ring-2 ring-warning")}>
                    {a.image_url ? <img src={a.image_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className={cn("h-full w-full", tone === "critical" ? "bg-critical" : a.category === "alert" ? "bg-warning" : "bg-gradient-brand")} />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-white/85">
                        {a.category === "alert" || tone === "critical" ? <AlertTriangle size={12} /> : <Megaphone size={12} />} {ANNOUNCEMENT_CATEGORY[a.category ?? "announcement"] ?? "Pengumuman"}
                        {a.requires_ack && !a.acknowledged_at && <span className="ml-1 rounded bg-white/25 px-1">Perlu konfirmasi</span>}
                        {!a.read_at && <span className="ml-auto h-2 w-2 rounded-full bg-accent-amber" aria-label="Belum dibaca" />}
                      </div>
                      <div className="line-clamp-2 text-[15px] font-bold leading-tight">{a.title}</div>
                    </div>
                  </button>
                );
              })}
          {!ann.isLoading && (ann.data?.data ?? []).length === 0 && <p className="px-1 text-[13px] text-neutral-500">Belum ada pengumuman.</p>}
        </div>
      </section>

      <Sheet open={switching} onClose={() => setSwitching(false)} title={`Pilih ${term(user, "inventory_unit").toLowerCase()} aktif`}>
        <ul className="space-y-2">
          {(user?.units ?? []).map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => {
                  setActiveUnitId(u.id);
                  setSwitching(false);
                }}
                className={cn("tap flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left", unit?.id === u.id ? "border-brand-500 bg-brand-50/50" : "border-border")}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold">{u.name}</div>
                  <div className="truncate text-[11px] text-neutral-500">{u.path_text}</div>
                </div>
                {unit?.id === u.id && <CheckCircle2 size={20} className="text-brand-600" />}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
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

function Quick({ icon: I, label, color, onClick, badge }: { icon: typeof Wallet; label: string; color: string; onClick: () => void; badge?: number }) {
  return (
    <button type="button" onClick={onClick} className="tap relative flex flex-col items-center gap-2 rounded-2xl bg-card p-3 shadow-card">
      <span className={cn("flex h-12 w-12 items-center justify-center rounded-full text-white", color)}>
        <I size={24} />
      </span>
      {!!badge && <span className="absolute right-3 top-2 min-w-[20px] rounded-full bg-critical px-1.5 text-center text-[11px] font-bold leading-[20px] text-white">{badge > 9 ? "9+" : badge}</span>}
      <span className="text-center text-[12px] font-semibold leading-tight text-neutral-700">{label}</span>
    </button>
  );
}
