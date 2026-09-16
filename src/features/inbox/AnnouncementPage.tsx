// Detail pengumuman (Tenant Relation › Communication → Tenant App Inbox): hero gambar (opsional), judul, isi, masa berlaku.
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Megaphone, Share2 } from "lucide-react";
import { api } from "@/api";
import { Page } from "@/components/ui/shell";
import { ErrorState, Skeleton } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/http";
import { fmtDate, fmtRelative } from "@/lib/format";

export default function AnnouncementPage() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const q = useQuery({ queryKey: ["announcements", id], queryFn: () => api().announcement(id) });

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: q.data?.title, text: q.data?.excerpt ?? q.data?.title, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Tautan disalin.");
      }
    } catch {
      /* dibatalkan */
    }
  }

  return (
    <Page className="bg-card">
      <div className="relative">
        {q.data?.image_url ? <img src={q.data.image_url} alt="" className="h-[240px] w-full object-cover" /> : <div className="flex h-[160px] w-full items-center justify-center bg-gradient-brand text-white"><Megaphone size={56} strokeWidth={1.4} /></div>}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[calc(var(--safe-top)+12px)]">
          <button type="button" onClick={() => nav(-1)} aria-label="Kembali" className="tap flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-brand-600 shadow-card">
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          <button type="button" onClick={share} aria-label="Bagikan" className="tap flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-brand-600 shadow-card">
            <Share2 size={18} />
          </button>
        </div>
      </div>
      {q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : q.data ? (
        <article className="px-5 pb-12 pt-5 fade-up">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase text-neutral-500">
            {(q.data.importance === "important" || q.data.importance === "urgent") && <span className="rounded-md bg-warning-soft px-1.5 py-0.5 text-warning-text">Penting</span>}
            <span>Building management{q.data.published_at ? ` · ${fmtRelative(q.data.published_at)}` : ""}</span>
          </div>
          <h1 className="mt-3 text-[24px] font-bold leading-tight text-neutral-800">{q.data.title}</h1>
          <div className="mt-5 space-y-4 text-[16px] leading-relaxed text-neutral-700">
            {q.data.body.split(/\n\s*\n/).map((p, i) => (
              <p key={i} className="whitespace-pre-line">{p}</p>
            ))}
          </div>
          {q.data.expires_at && <p className="mt-6 text-[12px] text-neutral-500">Berlaku sampai {fmtDate(q.data.expires_at)}</p>}
        </article>
      ) : (
        <div className="space-y-4 px-5 pt-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}
    </Page>
  );
}
