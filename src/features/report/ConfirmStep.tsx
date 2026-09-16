// Langkah 5 — Submit (PRD §10): ringkasan lokasi, kategori, uraian, foto → POST /tenant/requests (idempoten) → Ticket Created.
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Tag } from "lucide-react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { StickyFooter } from "@/components/ui/shell";
import { PhotoStrip } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { CategoryIcon } from "@/components/category-icon";
import { errorMessage } from "@/lib/http";
import { fmtDateTimeComma } from "@/lib/format";
import { useReportDraft } from "./ReportLayout";

export default function ConfirmStep() {
  const { draft, reset } = useReportDraft();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!draft.category || !draft.location) return;
    if (!navigator.onLine) {
      toast.error("Anda sedang offline. Draft tersimpan; kirim lagi saat online.");
      return;
    }
    setLoading(true);
    try {
      const sr = await api().createServiceRequest({
        category_code: draft.category.code,
        title: draft.title.trim() || draft.description.trim().slice(0, 80),
        description: draft.description.trim(),
        area_scope: draft.location.scope,
        location_id: draft.location.id,
        location_label: draft.location.label,
        contact_preference: draft.contact_preference || null,
        preferred_visit_at: draft.preferred_visit_at ? new Date(draft.preferred_visit_at).toISOString() : null,
        additional_note: draft.additional_note.trim() || null,
        photos: draft.photos.map((p) => p.blob),
        idempotency_key: draft.idempotency_key,
      });
      qc.invalidateQueries({ queryKey: ["service-requests"] });
      qc.invalidateQueries({ queryKey: ["unread"] });
      reset();
      nav(`/report/success/${sr.id}`, { replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const scopeLabel = draft.location?.scope === "unit" ? "Unit" : draft.location?.scope === "common_area" ? "Common Area" : "Other Authorized Area";

  return (
    <>
      <div className="flex flex-1 flex-col bg-neutral-100">
        <section className="bg-card px-4 pb-5 pt-5 shadow-card">
          <div className="flex items-center gap-3">
            <CategoryIcon icon={draft.category?.icon ?? "other"} size={52} color="#f5b335" />
            <div>
              <div className="text-[11px] font-semibold uppercase text-neutral-500">Kategori</div>
              <div className="text-[18px] font-bold text-neutral-800">{draft.category?.name}</div>
            </div>
            <button type="button" className="ml-auto text-[13px] font-semibold text-brand-600" onClick={() => nav("/report/category")}>
              Ubah
            </button>
          </div>
          {draft.photos.length > 0 && <PhotoStrip photos={draft.photos} size={200} className="mt-4" />}
        </section>
        <Section icon={<MapPin size={20} className="text-brand-500" />} title="Lokasi" onEdit={() => nav("/report/location")}>
          <p className="text-[15px] text-neutral-700">{draft.location?.label}</p>
          <span className="mt-1 inline-block rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">{scopeLabel}</span>
        </Section>
        <Section icon={<Tag size={20} className="text-brand-500" />} title="Judul" onEdit={() => nav("/report/describe")}>
          <p className="text-[15px] font-semibold text-neutral-800">{draft.title.trim() || draft.description.trim().slice(0, 80)}</p>
        </Section>
        <Section icon={<Pencil size={20} className="text-brand-500" />} title="Uraian masalah" onEdit={() => nav("/report/describe")}>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-700">{draft.description}</p>
          {(draft.contact_preference || draft.preferred_visit_at || draft.additional_note) && (
            <ul className="mt-3 space-y-1 text-[13px] text-neutral-600">
              {draft.contact_preference && <li>Kontak: {draft.contact_preference}</li>}
              {draft.preferred_visit_at && <li>Waktu kunjungan: {fmtDateTimeComma(new Date(draft.preferred_visit_at))}</li>}
              {draft.additional_note && <li>Catatan: {draft.additional_note}</li>}
            </ul>
          )}
        </Section>
        <div className="flex-1" />
      </div>
      <StickyFooter className="bg-neutral-100/95">
        <Button block size="lg" onClick={submit} loading={loading}>
          Kirim Ticket
        </Button>
        <p className="mt-2 text-center text-[11px] text-neutral-500">Prioritas ditentukan building management berdasarkan kategori.</p>
      </StickyFooter>
    </>
  );
}

function Section({ icon, title, onEdit, children }: { icon: ReactNode; title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="mt-3 bg-card shadow-card">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        {icon}
        <h2 className="flex-1 text-[15px] font-bold text-neutral-800">{title}</h2>
        <button type="button" className="text-[13px] font-semibold text-brand-600" onClick={onEdit}>
          Ubah
        </button>
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}
