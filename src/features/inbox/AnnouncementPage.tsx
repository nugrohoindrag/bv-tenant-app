// Detail pengumuman (Tenant Relation › Communication → Tenant App Inbox): hero gambar (opsional), kategori & severity (alert
// menonjol), isi, masa berlaku. Membuka = tercatat dibaca di server; pengumuman `requires_ack` punya tombol konfirmasi (P3-ANN-05).
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ChevronLeft, Megaphone, Share2 } from "lucide-react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Page, StickyFooter } from "@/components/ui/shell";
import { ErrorState, Skeleton } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/http";
import { fmtDate, fmtDateTime, fmtRelative } from "@/lib/format";
import { ANNOUNCEMENT_CATEGORY, announcementTone } from "@/lib/labels";
import { cn } from "@/lib/utils";

export default function AnnouncementPage() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ["announcements", "detail", id], queryFn: () => api().announcement(id) });
  const loaded = !!q.data;
  // server mencatat baca saat detail dibuka → segarkan penanda belum dibaca di daftar
  useEffect(() => {
    if (loaded) void qc.invalidateQueries({ queryKey: ["announcements", "list"] });
  }, [loaded, qc]);
  const ack = useMutation({
    mutationFn: () => api().acknowledgeAnnouncement(id),
    onSuccess: (a) => {
      qc.setQueryData(["announcements", "detail", id], a);
      void qc.invalidateQueries({ queryKey: ["announcements", "list"] });
      toast.success("Terima kasih, konfirmasi Anda tercatat.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

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

  const a = q.data;
  const tone = a ? announcementTone(a) : "info";
  const needsAck = !!a?.requires_ack && !a.acknowledged_at;
  return (
    <Page className={cn("bg-card", needsAck && "pb-28")}>
      <div className="relative">
        {a?.image_url ? (
          <img src={a.image_url} alt="" className="h-[240px] w-full object-cover" />
        ) : (
          <div className={cn("flex h-[160px] w-full items-center justify-center text-white", tone === "critical" ? "bg-critical" : tone === "warning" ? "bg-warning" : "bg-gradient-brand")}>
            {tone === "info" ? <Megaphone size={56} strokeWidth={1.4} /> : <AlertTriangle size={56} strokeWidth={1.4} />}
          </div>
        )}
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
      ) : a ? (
        <article className="px-5 pb-12 pt-5 fade-up">
          <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold uppercase text-neutral-500">
            <span className={cn("rounded-md px-1.5 py-0.5", tone === "critical" ? "bg-critical text-white" : tone === "warning" ? "bg-warning-soft text-warning-text" : "bg-brand-50 text-brand-700")}>{ANNOUNCEMENT_CATEGORY[a.category ?? "announcement"] ?? "Pengumuman"}</span>
            <span>Building management{a.published_at ? ` · ${fmtRelative(a.published_at)}` : ""}</span>
          </div>
          <h1 className="mt-3 text-[24px] font-bold leading-tight text-neutral-800">{a.title}</h1>
          <div className="mt-5 space-y-4 text-[16px] leading-relaxed text-neutral-700">
            {a.body.split(/\n\s*\n/).map((p, i) => (
              <p key={i} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
          {a.expires_at && <p className="mt-6 text-[12px] text-neutral-500">Berlaku sampai {fmtDate(a.expires_at)}</p>}
          {a.acknowledged_at && (
            <p className="mt-4 flex items-center gap-1.5 rounded-lg bg-success-soft px-3 py-2 text-[13px] text-success-text">
              <CheckCircle2 size={16} /> Anda sudah mengonfirmasi membaca pengumuman ini ({fmtDateTime(a.acknowledged_at)}).
            </p>
          )}
        </article>
      ) : (
        <div className="space-y-4 px-5 pt-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}
      {needsAck && (
        <StickyFooter>
          <Button block size="lg" loading={ack.isPending} onClick={() => ack.mutate()}>
            <CheckCircle2 size={18} /> Saya sudah membaca
          </Button>
        </StickyFooter>
      )}
    </Page>
  );
}
