// Inbox (PRD P1 v1.3 §20; ikon lonceng di header, D-P3-01): notifikasi tenant + Pengumuman building management dengan filter
// kategori (Semua / Pengumuman / News / Alert — D-P3-06), gaya per severity, penanda belum dibaca & perlu konfirmasi (P3-ANN-05).
// Deep link server divalidasi ke route yang ada (B-01): /requests/{id}, /bills/{id}?payment=, /packages/{id}, /parking/permits/{id},
// /feedback/{id}, /inbox/announcements/{id}, /account, … — tidak dikenal → tetap di Inbox.
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bell, CalendarDays, Car, CheckCheck, ClipboardList, Megaphone, MessageSquareText, Package, UserRound, Wallet } from "lucide-react";
import { api } from "@/api";
import type { Announcement, AnnouncementCategory, Notification } from "@/api/types";
import { Page, TopBar } from "@/components/ui/shell";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/misc";
import { FilterTabs } from "@/components/ui/controls";
import { errorMessage } from "@/lib/http";
import { fmtRelative } from "@/lib/format";
import { resolveDeepLink } from "@/lib/deep-link";
import { ANNOUNCEMENT_CATEGORY, ANNOUNCEMENT_FILTERS, announcementTone } from "@/lib/labels";
import { cn } from "@/lib/utils";

function iconFor(n: Notification) {
  switch (n.object_type) {
    case "service_request":
      return <ClipboardList size={20} />;
    case "booking":
      return <CalendarDays size={20} />;
    case "visitor":
      return <UserRound size={20} />;
    case "invoice":
    case "payment":
    case "credit_note":
      return <Wallet size={20} />;
    case "announcement":
      return <Megaphone size={20} />;
    case "package":
      return <Package size={20} />;
    case "parking_permit":
    case "parking_violation":
      return <Car size={20} />;
    case "tenant_feedback":
      return <MessageSquareText size={20} />;
    default:
      return <Bell size={20} />;
  }
}

export default function InboxPage() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") === "announcements" ? "announcements" : "notifications";
  const cat = (sp.get("category") ?? "") as "" | AnnouncementCategory;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notifications"], queryFn: () => api().notifications(), enabled: tab === "notifications", refetchInterval: 30_000 });
  const ann = useQuery({ queryKey: ["announcements", "list", cat], queryFn: () => api().announcements({ category: cat || null }), enabled: tab === "announcements" });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["unread"] });
  };
  const read = useMutation({ mutationFn: (id: string) => api().markRead(id), onSuccess: invalidate });
  const readAll = useMutation({ mutationFn: () => api().markAllRead(), onSuccess: invalidate });
  const unread = q.data?.filter((n) => !n.read_at).length ?? 0;

  return (
    <Page bottomNav>
      <TopBar title="Inbox" onBack={() => nav("/")} right={tab === "notifications" && unread > 0 ? <button type="button" onClick={() => readAll.mutate()} aria-label="Tandai semua dibaca" className="tap p-2 text-brand-600"><CheckCheck size={20} /></button> : undefined} />
      <div className="flex gap-2 px-4 pb-3 pt-3">
        {(["notifications", "announcements"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setSp(t === "notifications" ? {} : { tab: t })} className={cn("rounded-full px-4 py-1.5 text-[13px] font-semibold", tab === t ? "bg-brand-600 text-white" : "bg-card text-neutral-text shadow-card")}>
            {t === "notifications" ? `Notifikasi${unread ? ` (${unread})` : ""}` : "Pengumuman"}
          </button>
        ))}
      </div>
      {tab === "announcements" && (
        <FilterTabs
          className="px-4 pb-3"
          value={cat}
          onChange={(c) => setSp(c ? { tab: "announcements", category: c } : { tab: "announcements" }, { replace: true })}
          options={ANNOUNCEMENT_FILTERS.map((f) => ({ value: f.key, label: f.label }))}
        />
      )}
      <div className="flex flex-col gap-2 px-4 pb-4">
        {tab === "notifications" ? (
          q.isLoading ? (
            [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[76px] rounded-xl" />)
          ) : q.error ? (
            <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
          ) : !q.data?.length ? (
            <EmptyState icon={<Bell size={48} />} title="Belum ada notifikasi" description="Pembaruan permintaan, booking, tamu, paket, parkir, dan tagihan akan tampil di sini." />
          ) : (
            q.data.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  if (!n.read_at) read.mutate(n.id);
                  if (n.deep_link) nav(resolveDeepLink(n.deep_link));
                }}
                className={cn("tap flex items-start gap-3 rounded-xl p-3.5 text-left shadow-card", n.read_at ? "bg-card" : "bg-brand-50/70 ring-1 ring-brand-100")}
              >
                <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", n.read_at ? "bg-neutral-100 text-neutral-500" : n.severity === "critical" ? "bg-critical text-white" : n.severity === "warning" ? "bg-warning text-white" : "bg-brand-500 text-white")}>{iconFor(n)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className={cn("truncate text-[14px]", n.read_at ? "font-semibold" : "font-bold")}>{n.title}</div>
                    <div className="shrink-0 text-[11px] text-neutral-400">{fmtRelative(n.created_at)}</div>
                  </div>
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-[13px] text-neutral-600">{n.body}</p>
                </div>
              </button>
            ))
          )
        ) : ann.isLoading ? (
          [0, 1].map((i) => <Skeleton key={i} className="h-[120px] rounded-xl" />)
        ) : ann.error ? (
          <ErrorState message={errorMessage(ann.error)} onRetry={() => ann.refetch()} />
        ) : !ann.data?.data.length ? (
          <EmptyState icon={<Megaphone size={48} />} title={cat ? `Belum ada ${ANNOUNCEMENT_CATEGORY[cat]?.toLowerCase() ?? "pengumuman"}` : "Belum ada pengumuman"} />
        ) : (
          ann.data.data.map((a) => <AnnouncementCard key={a.id} a={a} onClick={() => nav(`/inbox/announcements/${a.id}`)} />)
        )}
      </div>
    </Page>
  );
}

function AnnouncementCard({ a, onClick }: { a: Announcement; onClick: () => void }) {
  const tone = announcementTone(a);
  const needsAck = a.requires_ack && !a.acknowledged_at;
  return (
    <button type="button" onClick={onClick} className={cn("tap overflow-hidden rounded-xl bg-card text-left shadow-card", tone === "critical" ? "ring-2 ring-critical" : tone === "warning" ? "ring-1 ring-warning" : undefined)}>
      {a.image_url && <img src={a.image_url} alt="" className="h-32 w-full object-cover" loading="lazy" />}
      <div className="p-3.5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase text-neutral-500">
          <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5", tone === "critical" ? "bg-critical text-white" : tone === "warning" ? "bg-warning-soft text-warning-text" : a.category === "news" ? "bg-info-soft text-info-text" : "bg-brand-50 text-brand-700")}>
            {tone !== "info" && <AlertTriangle size={11} />}
            {ANNOUNCEMENT_CATEGORY[a.category ?? "announcement"] ?? "Pengumuman"}
          </span>
          {needsAck && <span className="rounded-md bg-warning px-1.5 py-0.5 text-white">Perlu konfirmasi</span>}
          <span>{a.published_at ? fmtRelative(a.published_at) : ""}</span>
          {!a.read_at && <span className="ml-auto h-2 w-2 rounded-full bg-brand-500" aria-label="Belum dibaca" />}
        </div>
        <div className={cn("mt-1 text-[15px]", a.read_at ? "font-semibold" : "font-bold")}>{a.title}</div>
        {a.excerpt && <p className="mt-0.5 line-clamp-2 text-[13px] text-neutral-600">{a.excerpt}</p>}
      </div>
    </button>
  );
}
