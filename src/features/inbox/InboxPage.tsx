// Inbox (PRD P1 v1.3 §20; nav Inbox): notifikasi tenant (ticket, booking, tamu, tagihan) + Pengumuman building management.
// Deep link dari server (/requests/{id}, /facilities/bookings/{id}, /visitors/{id}, /bills/{id}, /inbox/announcements/{id}).
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarDays, CheckCheck, ClipboardList, Megaphone, UserRound, Wallet } from "lucide-react";
import { api } from "@/api";
import type { Notification } from "@/api/types";
import { Page, TopBar } from "@/components/ui/shell";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/misc";
import { errorMessage } from "@/lib/http";
import { fmtRelative } from "@/lib/format";
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
      return <Wallet size={20} />;
    case "announcement":
      return <Megaphone size={20} />;
    default:
      return <Bell size={20} />;
  }
}

export default function InboxPage() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") === "announcements" ? "announcements" : "notifications";
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notifications"], queryFn: () => api().notifications(), enabled: tab === "notifications", refetchInterval: 30_000 });
  const ann = useQuery({ queryKey: ["announcements"], queryFn: () => api().announcements(), enabled: tab === "announcements" });
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
      <div className="flex flex-col gap-2 px-4 pb-4">
        {tab === "notifications" ? (
          q.isLoading ? (
            [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[76px] rounded-xl" />)
          ) : q.error ? (
            <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
          ) : !q.data?.length ? (
            <EmptyState icon={<Bell size={48} />} title="Belum ada notifikasi" description="Pembaruan ticket, booking, tamu, dan tagihan akan tampil di sini." />
          ) : (
            q.data.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  if (!n.read_at) read.mutate(n.id);
                  if (n.deep_link) nav(n.deep_link);
                }}
                className={cn("tap flex items-start gap-3 rounded-xl p-3.5 text-left shadow-card", n.read_at ? "bg-card" : "bg-brand-50/70 ring-1 ring-brand-100")}
              >
                <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", n.read_at ? "bg-neutral-100 text-neutral-500" : n.severity === "warning" || n.severity === "critical" ? "bg-warning text-white" : "bg-brand-500 text-white")}>{iconFor(n)}</span>
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
          <EmptyState icon={<Megaphone size={48} />} title="Belum ada pengumuman" />
        ) : (
          ann.data.data.map((a) => (
            <button key={a.id} type="button" onClick={() => nav(`/inbox/announcements/${a.id}`)} className="tap overflow-hidden rounded-xl bg-card text-left shadow-card">
              {a.image_url && <img src={a.image_url} alt="" className="h-32 w-full object-cover" loading="lazy" />}
              <div className="p-3.5">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-neutral-500">
                  {(a.importance === "important" || a.importance === "urgent") && <span className="rounded-md bg-warning-soft px-1.5 py-0.5 text-warning-text">Penting</span>}
                  {a.published_at ? fmtRelative(a.published_at) : ""}
                </div>
                <div className="mt-1 text-[15px] font-bold">{a.title}</div>
                {a.excerpt && <p className="mt-0.5 line-clamp-2 text-[13px] text-neutral-600">{a.excerpt}</p>}
              </div>
            </button>
          ))
        )}
      </div>
    </Page>
  );
}
