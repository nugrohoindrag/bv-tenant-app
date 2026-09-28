// Kirim masukan umum (P3-FDB-02): kategori, judul (opsional), isi, anonim opsional, foto opsional (lampiran tenant_feedback).
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import { useAuth } from "@/app/auth";
import type { FeedbackCategory } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { ChipGroup, Section, Switch } from "@/components/ui/controls";
import { Page, StickyFooter, TopBar } from "@/components/ui/shell";
import { useToast } from "@/components/ui/toast";
import { FilePicker, type PickedFile } from "@/components/attachments";
import { errorMessage, isApiError } from "@/lib/http";
import { FEEDBACK_CATEGORY } from "@/lib/labels";
import { useActiveUnit } from "@/lib/active-unit";

const CATS: { value: FeedbackCategory; label: string }[] = (["suggestion", "compliment", "complaint", "question", "other"] as FeedbackCategory[]).map((v) => ({ value: v, label: FEEDBACK_CATEGORY[v] }));
export const FEEDBACK_MAX = 4000;

export default function NewFeedbackPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const unit = useActiveUnit(user);
  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [photos, setPhotos] = useState<PickedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () => api().createFeedback({ category, subject: subject.trim(), body: body.trim(), is_anonymous: anonymous, unit_id: unit?.id ?? null }, photos.map((p) => p.blob)),
    onSuccess: (f) => {
      qc.invalidateQueries({ queryKey: ["tenant-feedback"] });
      toast.success("Terima kasih, masukan Anda terkirim.");
      nav(`/feedback/${f.id}`, { replace: true });
    },
    onError: (e) => {
      setError(isApiError(e) && e.problem.errors?.length ? e.problem.errors.map((x) => x.message).join(", ") : errorMessage(e));
    },
  });
  const submit = () => {
    setError(null);
    if (body.trim().length < 5) return setError("Tulis masukan Anda (minimal 5 karakter).");
    if (body.length > FEEDBACK_MAX) return setError(`Masukan maksimal ${FEEDBACK_MAX} karakter.`);
    m.mutate();
  };
  return (
    <Page className="bg-neutral-100 pb-28">
      <TopBar title="Kirim Masukan" />
      <div className="space-y-3 p-4">
        <Section>
          <div className="space-y-4">
            <ChipGroup label="Kategori" value={category} onChange={setCategory} options={CATS} />
            {category === "complaint" && <p className="rounded-lg bg-warning-soft px-3 py-2 text-[12px] text-warning-text">Keluhan tentang kerusakan/pekerjaan (AC, listrik, kebersihan unit) lebih cepat ditangani lewat Report an Issue dengan tipe Keluhan.</p>}
            <Input variant="box" label="Judul (opsional)" maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="mis. Tempat duduk di taman" />
            <Textarea label="Masukan Anda" rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ceritakan saran atau pengalaman Anda…" hint={`${body.length}/${FEEDBACK_MAX}`} />
            <label className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-[14px] font-semibold">Kirim sebagai anonim</span>
                <span className="block text-[12px] text-neutral-500">Nama Anda tidak ditampilkan kepada staf yang menanggapi.</span>
              </span>
              <Switch checked={anonymous} onChange={setAnonymous} label="Kirim sebagai anonim" />
            </label>
          </div>
        </Section>
        <Section title="Foto (opsional)">
          <FilePicker files={photos} onChange={setPhotos} max={3} onRejected={(msgs) => toast.error(msgs.join(", "))} />
        </Section>
        {error && (
          <div role="alert" className="rounded-lg bg-critical-soft px-3 py-2 text-sm text-critical-text">
            {error}
          </div>
        )}
      </div>
      <StickyFooter>
        <Button block size="lg" loading={m.isPending} onClick={submit}>
          Kirim masukan
        </Button>
      </StickyFooter>
    </Page>
  );
}
