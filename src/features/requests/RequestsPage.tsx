// Requests (PRD P1 v1.3 §9 "Ticket"; nav Requests): daftar ticket dengan status tenant-facing (§14) + filter + cari.
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, MessageCircle, Plus, Search } from "lucide-react";
import { api } from "@/api";
import type { ServiceRequest } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Page, TabHeader } from "@/components/ui/shell";
import { EmptyState, ErrorState, Skeleton, StatusBadge } from "@/components/ui/misc";
import { CategoryIcon } from "@/components/category-icon";
import { errorMessage } from "@/lib/http";
import { fmtRelative } from "@/lib/format";
import { useDebounced } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const filters = [
  { key: "", label: "Semua", status: undefined, open: false },
  { key: "open", label: "Berjalan", status: "new,acknowledged,assigned,in_progress", open: false },
  { key: "need_response", label: "Butuh respons", status: "waiting_for_tenant", open: false },
  { key: "resolved", label: "Perlu konfirmasi", status: "resolved", open: false },
  { key: "done", label: "Selesai", status: "closed,cancelled", open: false },
];

export default function RequestsPage() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const f = filters.find((x) => x.key === (sp.get("f") ?? "")) ?? filters[0];
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);
  const list = useQuery({ queryKey: ["service-requests", { status: f.status, q: dq }], queryFn: () => api().serviceRequests({ status: f.status, q: dq || undefined }), refetchInterval: 20_000 });

  return (
    <Page bottomNav>
      <TabHeader title="Requests" subtitle="Ticket & permintaan Anda ke building management" right={<Button size="sm" onClick={() => nav("/report")}><Plus size={16} /> Ticket</Button>}>
        <div className="px-4 pb-2">
          <label className="flex items-center gap-2 rounded-full bg-card px-3 py-2 shadow-card">
            <Search size={16} className="text-neutral-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nomor / judul ticket" className="w-full bg-transparent text-[14px] outline-none" />
          </label>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
          {filters.map((x) => (
            <button key={x.key} type="button" onClick={() => setSp(x.key ? { f: x.key } : {})} className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold", f.key === x.key ? "bg-brand-600 text-white" : "bg-card text-neutral-text shadow-card")}>
              {x.label}
            </button>
          ))}
        </div>
      </TabHeader>
      <div className="flex flex-col gap-3 px-4 pb-4 pt-1">
        {list.isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-[92px] rounded-xl" />)
        ) : list.error ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
        ) : !list.data?.data.length ? (
          <EmptyState icon={<ClipboardList size={48} />} title="Belum ada ticket" description="Laporkan masalah di unit atau area gedung; progresnya bisa dipantau di sini." action={<Button onClick={() => nav("/report")}>Report an Issue</Button>} />
        ) : (
          list.data.data.map((sr) => <RequestCard key={sr.id} sr={sr} onClick={() => nav(`/requests/${sr.id}`)} />)
        )}
      </div>
    </Page>
  );
}

export function RequestCard({ sr, onClick }: { sr: ServiceRequest; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="tap flex items-center gap-3 rounded-xl bg-card p-4 text-left shadow-card">
      <CategoryIcon icon={sr.category_icon ?? sr.category_code} size={40} color="#f5b335" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[14px] font-bold text-neutral-800">{sr.title}</span>
          {sr.unread_messages > 0 && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-critical px-1.5 text-[10px] font-bold text-white">
              <MessageCircle size={10} /> {sr.unread_messages}
            </span>
          )}
        </div>
        <div className="truncate text-[11px] text-neutral-500">
          {sr.category_name ?? sr.category_code} · {sr.location.name ?? "—"}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <StatusBadge status={sr.tenant_status} />
          <span className="text-[11px] text-neutral-500">
            {sr.request_number} · {fmtRelative(sr.created_at)}
          </span>
        </div>
      </div>
    </button>
  );
}
