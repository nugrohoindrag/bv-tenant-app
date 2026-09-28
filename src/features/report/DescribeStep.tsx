// Langkah 3 — Describe Problem (PRD §12 field: Title, Description; opsional Contact Preference, Preferred Visit Time, Additional Note).
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { StickyFooter } from "@/components/ui/shell";
import { CONTACT_PREFERENCES, REQUEST_TYPES } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useReportDraft } from "./ReportLayout";

const MIN = 10;

export default function DescribeStep() {
  const { draft, update } = useReportDraft();
  const nav = useNavigate();
  const [touched, setTouched] = useState(false);
  const [more, setMore] = useState(!!(draft.contact_preference || draft.preferred_visit_at || draft.additional_note));
  const len = draft.description.trim().length;
  const error = touched && len < MIN ? `Uraian minimal ${MIN} karakter agar petugas memahami masalah.` : null;
  const where = draft.location?.label.split(" · ").at(-1) ?? "unit";

  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (len < MIN) return;
    nav("/report/photo");
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <div className="space-y-4 px-4 pt-4">
        {/* PRD P1 v2 §27.2: jenis permintaan (default mengikuti kategori) */}
        <div>
          <div className="mb-2 text-[13px] font-semibold text-neutral-600">Jenis permintaan</div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Jenis permintaan">
            {REQUEST_TYPES.map((t) => {
              const active = (draft.request_type || "service_request") === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => update({ request_type: t.value })}
                  className={cn("tap rounded-full border px-3 py-1.5 text-[13px] font-semibold", active ? "border-brand-600 bg-brand-50 text-brand-700" : "border-neutral-300 text-neutral-600")}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
        <Input variant="box" label="Judul singkat" placeholder={draft.category ? `mis. ${draft.category.name} di ${where}` : "mis. AC tidak dingin"} value={draft.title} onChange={(e) => update({ title: e.target.value })} maxLength={120} />
        <Textarea variant="box" label="Uraian masalah" placeholder="Jelaskan apa yang terjadi, sejak kapan, dan kondisi saat ini" value={draft.description} onChange={(e) => update({ description: e.target.value })} onBlur={() => setTouched(true)} error={error} maxLength={1000} hint={!error ? `${len}/1000` : undefined} className="min-h-[160px]" />
        <button type="button" className="text-[13px] font-semibold text-brand-600" onClick={() => setMore(!more)}>
          {more ? "Sembunyikan opsi tambahan" : "+ Preferensi kontak & waktu kunjungan (opsional)"}
        </button>
        {more && (
          <div className="space-y-4 rounded-xl bg-neutral-50 p-3">
            <Select variant="box" label="Preferensi kontak" value={draft.contact_preference} onChange={(e) => update({ contact_preference: e.target.value })} options={[{ value: "", label: "— tidak ada —" }, ...CONTACT_PREFERENCES]} />
            <Input variant="box" label="Waktu kunjungan yang diinginkan" type="datetime-local" value={draft.preferred_visit_at} onChange={(e) => update({ preferred_visit_at: e.target.value })} />
            <Input variant="box" label="Catatan tambahan" placeholder="mis. kunci dititipkan di resepsionis" value={draft.additional_note} onChange={(e) => update({ additional_note: e.target.value })} maxLength={300} />
          </div>
        )}
      </div>
      <div className="flex-1" />
      <StickyFooter className="bg-card/95">
        <Button block size="lg" type="submit">
          Lanjut
        </Button>
      </StickyFooter>
    </form>
  );
}
