// Detail masukan (deep link notifikasi /feedback/{id}): isi, foto, status, dan tanggapan pengelola.
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { EyeOff, MessageSquareReply } from "lucide-react";
import { api } from "@/api";
import { Section } from "@/components/ui/controls";
import { Page, TopBar } from "@/components/ui/shell";
import { ErrorState, Skeleton, StatusBadge } from "@/components/ui/misc";
import { AttachmentList } from "@/components/attachments";
import { errorMessage } from "@/lib/http";
import { fmtDateTime } from "@/lib/format";
import { FEEDBACK_CATEGORY } from "@/lib/labels";

export default function FeedbackDetailPage() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: ["tenant-feedback", id], queryFn: () => api().feedback(id), refetchInterval: 60_000 });
  const f = q.data;
  return (
    <Page className="bg-neutral-100 pb-8">
      <TopBar title={f?.feedback_number ?? "Masukan"} />
      {q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !f ? (
        <div className="p-4">
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-3 p-4 fade-up">
          <Section>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase text-neutral-500">{FEEDBACK_CATEGORY[f.category] ?? f.category}</div>
                <h1 className="text-[17px] font-bold leading-tight text-neutral-800">{f.subject || "Masukan"}</h1>
                <div className="text-[11px] text-neutral-500">Dikirim {fmtDateTime(f.created_at)}</div>
              </div>
              <StatusBadge status={f.status} objectType="tenant_feedback" />
            </div>
            <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-neutral-700">{f.body}</p>
            {f.is_anonymous && (
              <div className="mt-2 flex items-center gap-1.5 text-[12px] text-neutral-500">
                <EyeOff size={14} /> Dikirim sebagai anonim
              </div>
            )}
            <AttachmentList className="mt-3" items={f.photos.map((p) => ({ id: p.id, url: p.url, thumb_url: p.thumb_url, content_type: "image/jpeg" }))} />
          </Section>
          <Section title="Tanggapan pengelola">
            {f.response ? (
              <div className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <MessageSquareReply size={18} />
                </span>
                <div>
                  <p className="whitespace-pre-line text-[14px] leading-relaxed text-neutral-800">{f.response}</p>
                  {f.responded_at && <div className="mt-1 text-[11px] text-neutral-500">{fmtDateTime(f.responded_at)}</div>}
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-neutral-500">Belum ada tanggapan. Anda akan mendapat notifikasi saat pengelola menanggapi.</p>
            )}
          </Section>
        </div>
      )}
    </Page>
  );
}
