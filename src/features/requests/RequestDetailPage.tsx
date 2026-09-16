// Detail Ticket (PRD P1 v1.3 §14–§17, WF-P1-002/003): status tenant-facing, tracking timeline dari server, foto (masalah & hasil
// yang dibagikan), pesan dua arah dengan building management, aksi tenant sesuai allowed_actions: Konfirmasi selesai (→ Closed),
// Buka kembali (reopen, auditable), Batalkan, dan penilaian (CSAT). Tidak menampilkan WO/Task internal, komentar staf, biaya, atau
// assignment terbatas (hanya nama team bila diizinkan) — guardrail PRD §20.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, CheckCircle2, Clock, MapPin, MessageCircle, RotateCcw, Send, Star, Users, XCircle } from "lucide-react";
import { api } from "@/api";
import { useAuth } from "@/app/auth";
import type { ServiceRequest, TimelineEvent } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Page, TopBar } from "@/components/ui/shell";
import { Dialog, ErrorState, PhotoStrip, Sheet, Skeleton, StatusBadge } from "@/components/ui/misc";
import { Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { CategoryIcon } from "@/components/category-icon";
import { errorMessage } from "@/lib/http";
import { fmtDateTime, fmtDateTimeComma, fmtRelative } from "@/lib/format";
import { compressImage, useObjectUrls } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const TL_ICON: Record<string, ReactNode> = {
  submitted: <Send size={14} />,
  received: <CheckCircle2 size={14} />,
  being_assigned: <Users size={14} />,
  in_progress: <Clock size={14} />,
  need_your_response: <MessageCircle size={14} />,
  resolved: <CheckCircle2 size={14} />,
  closed: <CheckCircle2 size={14} />,
  cancelled: <XCircle size={14} />,
  reopened: <RotateCcw size={14} />,
  message: <MessageCircle size={14} />,
};

export default function RequestDetailPage() {
  const { id = "" } = useParams();
  const [sp] = useSearchParams();
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ["service-requests", id], queryFn: () => api().serviceRequest(id), refetchInterval: 20_000 });
  const [sheet, setSheet] = useState<"reopen" | "cancel" | "feedback" | "messages" | null>(sp.get("messages") ? "messages" : null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["service-requests"] });
    qc.invalidateQueries({ queryKey: ["unread"] });
  };
  const confirm = useMutation({
    mutationFn: () => api().confirmRequest(id),
    onSuccess: (sr) => {
      invalidate();
      setConfirmOpen(false);
      toast.success("Terima kasih, ticket ditutup.");
      if (sr.allowed_actions.includes("feedback") && user?.features.csat_enabled) setSheet("feedback");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const sr = q.data;
  const can = (a: string) => !!sr?.allowed_actions.includes(a);

  if (q.error)
    return (
      <Page>
        <TopBar title="Ticket" />
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      </Page>
    );

  return (
    <Page className="bg-neutral-100 pb-28">
      <TopBar title={sr?.request_number ?? "Ticket"} />
      {!sr ? (
        <div className="space-y-3 p-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-40" />
          <Skeleton className="h-60" />
        </div>
      ) : (
        <div className="space-y-3 pb-4 fade-up">
          <section className="bg-card px-4 pb-5 pt-5 shadow-card">
            <div className="flex items-start gap-3">
              <CategoryIcon icon={sr.category_icon ?? sr.category_code} size={48} color="#f5b335" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase text-neutral-500">{sr.category_name ?? sr.category_code}</div>
                <div className="text-[17px] font-bold leading-tight text-neutral-800">{sr.title}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <StatusBadge status={sr.tenant_status} />
                  <span className="text-[11px] text-neutral-500">Dibuat {fmtRelative(sr.created_at)}</span>
                </div>
              </div>
            </div>
            {sr.tenant_status === "need_your_response" && (
              <button type="button" onClick={() => setSheet("messages")} className="tap mt-3 flex w-full items-center gap-2 rounded-xl bg-warning-soft p-3 text-left text-[13px] font-semibold text-warning-text">
                <MessageCircle size={18} /> Building management menunggu respons Anda — balas lewat pesan.
              </button>
            )}
            {sr.tenant_status === "resolved" && can("confirm") && (
              <div className="mt-3 rounded-xl bg-success-soft p-3 text-[13px] text-success-text">Pekerjaan dilaporkan selesai. Mohon konfirmasi bila sudah sesuai, atau buka kembali bila masih ada masalah.</div>
            )}
          </section>

          <Block title="Detail">
            <Row icon={<MapPin size={16} />} label="Lokasi" value={sr.location.path_text ?? sr.location.name ?? "—"} />
            {sr.due_estimate_at && !["resolved", "closed", "cancelled"].includes(sr.tenant_status) && <Row icon={<Clock size={16} />} label="Estimasi selesai" value={fmtDateTimeComma(sr.due_estimate_at)} />}
            {sr.assigned_team && <Row icon={<Users size={16} />} label="Ditangani oleh" value={sr.assigned_team} />}
            {sr.preferred_visit_at && <Row icon={<Clock size={16} />} label="Waktu kunjungan diminta" value={fmtDateTimeComma(sr.preferred_visit_at)} />}
            {sr.contact_preference && <Row icon={<MessageCircle size={16} />} label="Preferensi kontak" value={sr.contact_preference} />}
            <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-neutral-700">{sr.description}</p>
            {sr.additional_note && <p className="mt-2 text-[12px] text-neutral-500">Catatan: {sr.additional_note}</p>}
            {sr.photos.filter((p) => p.kind !== "resolution").length > 0 && <PhotoStrip photos={sr.photos.filter((p) => p.kind !== "resolution")} size={120} className="mt-3" />}
          </Block>

          {(sr.resolution || sr.photos.some((p) => p.kind === "resolution")) && (
            <Block title="Hasil pekerjaan">
              {sr.resolution && <p className="text-[13px] leading-relaxed text-neutral-700">{sr.resolution}</p>}
              {sr.photos.some((p) => p.kind === "resolution") && <PhotoStrip photos={sr.photos.filter((p) => p.kind === "resolution")} size={120} className="mt-3" />}
            </Block>
          )}

          {sr.feedback && (
            <Block title="Penilaian Anda">
              <div className="flex items-center gap-1 text-warning">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={18} fill={i <= sr.feedback!.rating ? "currentColor" : "none"} />)}</div>
              {sr.feedback.comment && <p className="mt-1 text-[13px] text-neutral-700">{sr.feedback.comment}</p>}
            </Block>
          )}

          <Block title="Tracking">
            <Timeline events={sr.timeline ?? []} />
          </Block>

          <div className="px-4">
            <button type="button" onClick={() => setSheet("messages")} className="tap flex w-full items-center gap-3 rounded-xl bg-card p-4 text-left shadow-card">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <MessageCircle size={20} />
              </span>
              <div className="flex-1">
                <div className="text-[14px] font-bold">Pesan dengan building management</div>
                <div className="text-[12px] text-neutral-500">{sr.message_count ? `${sr.message_count} pesan${sr.unread_messages ? ` · ${sr.unread_messages} belum dibaca` : ""}` : "Tanyakan progres atau beri info tambahan"}</div>
              </div>
              {sr.unread_messages > 0 && <span className="rounded-full bg-critical px-2 text-[11px] font-bold text-white">{sr.unread_messages}</span>}
            </button>
          </div>
        </div>
      )}

      {sr && (can("confirm") || can("reopen") || can("cancel") || can("feedback")) && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px] bg-background/95 px-4 pb-[calc(var(--safe-bottom)+12px)] pt-3 backdrop-blur">
          <div className="flex gap-2">
            {can("reopen") && (
              <Button block variant="outline" onClick={() => setSheet("reopen")}>
                <RotateCcw size={16} /> Buka kembali
              </Button>
            )}
            {can("confirm") && (
              <Button block onClick={() => setConfirmOpen(true)}>
                <CheckCircle2 size={16} /> Konfirmasi selesai
              </Button>
            )}
            {!can("confirm") && can("feedback") && (
              <Button block onClick={() => setSheet("feedback")}>
                <Star size={16} /> Beri penilaian
              </Button>
            )}
            {can("cancel") && !can("confirm") && !can("reopen") && (
              <Button block variant="outline" onClick={() => setSheet("cancel")}>
                Batalkan ticket
              </Button>
            )}
          </div>
        </div>
      )}

      {sr && <ReopenSheet open={sheet === "reopen"} onClose={() => setSheet(null)} sr={sr} onDone={invalidate} />}
      {sr && <CancelSheet open={sheet === "cancel"} onClose={() => setSheet(null)} sr={sr} onDone={invalidate} />}
      {sr && <FeedbackSheet open={sheet === "feedback"} onClose={() => setSheet(null)} sr={sr} onDone={invalidate} />}
      {sr && <MessagesSheet open={sheet === "messages"} onClose={() => setSheet(null)} sr={sr} onDone={invalidate} />}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Konfirmasi pekerjaan selesai?">
        <p className="text-[14px] text-neutral-700">Ticket akan ditutup. Bila masih ada masalah, gunakan "Buka kembali".</p>
        <div className="mt-4 flex gap-2">
          <Button block variant="outline" onClick={() => setConfirmOpen(false)}>
            Batal
          </Button>
          <Button block loading={confirm.isPending} onClick={() => confirm.mutate()}>
            Ya, sudah selesai
          </Button>
        </div>
      </Dialog>
    </Page>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mx-4 rounded-xl bg-card p-4 shadow-card">
      <h2 className="mb-2 text-[14px] font-bold text-neutral-800">{title}</h2>
      {children}
    </section>
  );
}

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 py-1 text-[12px]">
      <span className="mt-0.5 text-brand-600">{icon}</span>
      <span className="w-[120px] shrink-0 text-neutral-500">{label}</span>
      <span className="flex-1 font-semibold text-neutral-800">{value}</span>
    </div>
  );
}

function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return <p className="text-[12px] text-neutral-500">Belum ada riwayat.</p>;
  return (
    <ol className="relative ml-2 border-l-2 border-brand-100 pl-5">
      {events.map((e, i) => {
        const last = i === events.length - 1;
        return (
          <li key={e.id} className="relative pb-4 last:pb-0">
            <span className={cn("absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full", last ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-700")}>{TL_ICON[e.key] ?? <Clock size={14} />}</span>
            <div className={cn("text-[13px]", last ? "font-bold text-neutral-800" : "font-semibold text-neutral-700")}>{e.title}</div>
            {e.detail && <div className="text-[12px] text-neutral-600">{e.detail}</div>}
            <div className="text-[11px] text-neutral-500">
              {fmtDateTime(e.occurred_at)} · {e.actor_kind === "tenant" ? "Anda" : e.actor_kind === "staff" ? "Building management" : "Sistem"}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function PhotoPicker({ photos, setPhotos, max = 5 }: { photos: Blob[]; setPhotos: (b: Blob[]) => void; max?: number }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const urls = useObjectUrls(photos);
  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const blobs = await Promise.all(Array.from(files).slice(0, max - photos.length).map((f) => compressImage(f)));
    setPhotos([...photos, ...blobs]);
    if (fileRef.current) fileRef.current.value = "";
  };
  return (
    <div>
      {photos.length > 0 && <PhotoStrip photos={photos.map((_, i) => ({ id: String(i), url: urls[i] }))} size={96} onRemove={(id) => setPhotos(photos.filter((_, i) => String(i) !== id))} className="mb-2" />}
      <Button block variant="soft" size="sm" onClick={() => fileRef.current?.click()} disabled={photos.length >= max}>
        <Camera size={16} /> Tambah foto ({photos.length}/{max})
      </Button>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
    </div>
  );
}

function ReopenSheet({ open, onClose, sr, onDone }: { open: boolean; onClose: () => void; sr: ServiceRequest; onDone: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [photos, setPhotos] = useState<Blob[]>([]);
  const m = useMutation({
    mutationFn: () => api().reopenRequest(sr.id, reason.trim(), photos),
    onSuccess: () => {
      onDone();
      onClose();
      setReason("");
      setPhotos([]);
      toast.success("Ticket dibuka kembali; building management akan menindaklanjuti.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Sheet open={open} onClose={onClose} title="Buka kembali ticket">
      <p className="mb-3 text-[13px] text-neutral-600">Jelaskan apa yang masih belum sesuai. Ticket kembali diproses dan tercatat sebagai reopen.</p>
      <Textarea variant="box" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: sudut plafon masih kotor" />
      <div className="mt-3">
        <PhotoPicker photos={photos} setPhotos={setPhotos} />
      </div>
      <Button block className="mt-4" disabled={reason.trim().length < 5} loading={m.isPending} onClick={() => m.mutate()}>
        Kirim
      </Button>
    </Sheet>
  );
}

function CancelSheet({ open, onClose, sr, onDone }: { open: boolean; onClose: () => void; sr: ServiceRequest; onDone: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const m = useMutation({
    mutationFn: () => api().cancelRequest(sr.id, reason.trim()),
    onSuccess: () => {
      onDone();
      onClose();
      toast.success("Ticket dibatalkan.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Sheet open={open} onClose={onClose} title="Batalkan ticket">
      <Textarea variant="box" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan pembatalan" />
      <Button block variant="danger" className="mt-4" disabled={reason.trim().length < 3} loading={m.isPending} onClick={() => m.mutate()}>
        Batalkan ticket
      </Button>
    </Sheet>
  );
}

function FeedbackSheet({ open, onClose, sr, onDone }: { open: boolean; onClose: () => void; sr: ServiceRequest; onDone: () => void }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const m = useMutation({
    mutationFn: () => api().sendFeedback(sr.id, rating, comment.trim()),
    onSuccess: () => {
      onDone();
      onClose();
      toast.success("Terima kasih atas penilaian Anda!");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Sheet open={open} onClose={onClose} title="Bagaimana layanan kami?">
      <div className="flex justify-center gap-2 py-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} bintang`} className={cn("tap", i <= rating ? "text-warning" : "text-neutral-300")}>
            <Star size={36} fill={i <= rating ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
      <Textarea variant="box" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Komentar (opsional)" />
      <Button block className="mt-4" disabled={rating === 0} loading={m.isPending} onClick={() => m.mutate()}>
        Kirim penilaian
      </Button>
    </Sheet>
  );
}

function MessagesSheet({ open, onClose, sr, onDone }: { open: boolean; onClose: () => void; sr: ServiceRequest; onDone: () => void }) {
  const toast = useToast();
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const q = useQuery({ queryKey: ["sr-messages", sr.id], queryFn: () => api().messages(sr.id), enabled: open, refetchInterval: open ? 10_000 : false });
  const m = useMutation({
    mutationFn: () => api().sendMessage(sr.id, body.trim()),
    onSuccess: () => {
      setBody("");
      q.refetch();
      onDone();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [open, q.data]);
  const canSend = sr.allowed_actions.includes("message");
  return (
    <Sheet open={open} onClose={onClose} title="Pesan" className="max-h-[85dvh]">
      <div className="max-h-[50dvh] space-y-2 overflow-y-auto pb-2">
        {q.isLoading ? (
          <Skeleton className="h-16" />
        ) : (q.data ?? []).length === 0 ? (
          <p className="py-6 text-center text-[13px] text-neutral-500">Belum ada pesan. Tulis pertanyaan atau info tambahan untuk building management.</p>
        ) : (
          (q.data ?? []).map((msg) => (
            <div key={msg.id} className={cn("flex", msg.author_kind === "tenant" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-[13px]", msg.author_kind === "tenant" ? "rounded-br-sm bg-brand-600 text-white" : "rounded-bl-sm bg-neutral-100 text-neutral-800")}>
                {msg.author_kind !== "tenant" && <div className="mb-0.5 text-[10px] font-semibold text-brand-700">{msg.author_name ?? "Building Management"}</div>}
                <div className="whitespace-pre-line">{msg.body}</div>
                <div className={cn("mt-0.5 text-[10px]", msg.author_kind === "tenant" ? "text-white/70" : "text-neutral-500")}>{fmtRelative(msg.created_at)}</div>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      {canSend ? (
        <div className="mt-2 flex items-end gap-2 border-t border-border pt-3">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Tulis pesan…" className="flex-1 resize-none rounded-xl border border-neutral-300 px-3 py-2 text-[14px] outline-none focus:border-brand-500" />
          <Button size="sm" className="h-10 w-10 !px-0" aria-label="Kirim" disabled={!body.trim()} loading={m.isPending} onClick={() => m.mutate()}>
            <Send size={16} />
          </Button>
        </div>
      ) : (
        <p className="mt-2 border-t border-border pt-3 text-center text-[12px] text-neutral-500">Ticket sudah ditutup; pesan tidak dapat dikirim.</p>
      )}
    </Sheet>
  );
}
