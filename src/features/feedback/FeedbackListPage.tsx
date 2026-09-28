// Masukan umum (P3-FDB-02): saran/pujian/keluhan/pertanyaan ke Tenant Relation di luar permintaan; status & tanggapan staf.
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, MessageSquareReply, MessageSquareText, Plus } from "lucide-react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Page, TopBar } from "@/components/ui/shell";
import { EmptyState, ErrorState, Skeleton, StatusBadge } from "@/components/ui/misc";
import { errorMessage } from "@/lib/http";
import { fmtRelative } from "@/lib/format";
import { FEEDBACK_CATEGORY } from "@/lib/labels";

export default function FeedbackListPage() {
  const nav = useNavigate();
  const q = useQuery({ queryKey: ["tenant-feedback"], queryFn: () => api().feedbackList() });
  const rows = q.data?.data ?? [];
  return (
    <Page className="bg-neutral-100 pb-8">
      <TopBar title="Masukan" right={<button type="button" aria-label="Kirim masukan" onClick={() => nav("/feedback/new")} className="tap p-2 text-brand-600"><Plus size={22} /></button>} />
      <div className="flex flex-col gap-3 p-4">
        <p className="px-1 text-[12px] text-neutral-600">Sampaikan saran, pujian, atau pertanyaan kepada pengelola gedung. Untuk kerusakan atau hal yang perlu dikerjakan, gunakan Report an Issue.</p>
        {q.isLoading ? (
          [0, 1].map((i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)
        ) : q.error ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<MessageSquareText size={48} />} title="Belum ada masukan" description="Masukan Anda membantu pengelola meningkatkan layanan gedung." action={<Button onClick={() => nav("/feedback/new")}>Kirim masukan</Button>} />
        ) : (
          rows.map((f) => (
            <button key={f.id} type="button" onClick={() => nav(`/feedback/${f.id}`)} className="tap flex items-start gap-3 rounded-xl bg-card p-4 text-left shadow-card">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-purple text-white">{f.response ? <MessageSquareReply size={18} /> : <MessageSquareText size={18} />}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[14px] font-bold text-neutral-800">{f.subject || FEEDBACK_CATEGORY[f.category] || "Masukan"}</span>
                  <StatusBadge status={f.status} objectType="tenant_feedback" className="shrink-0" />
                </div>
                <p className="line-clamp-2 text-[12px] text-neutral-600">{f.body}</p>
                <div className="mt-1 text-[11px] text-neutral-500">
                  {FEEDBACK_CATEGORY[f.category] ?? f.category} · {f.feedback_number} · {fmtRelative(f.created_at)}
                  {f.response ? " · ada tanggapan" : ""}
                </div>
              </div>
              <ChevronRight size={18} className="mt-2 text-neutral-400" />
            </button>
          ))
        )}
      </div>
    </Page>
  );
}
