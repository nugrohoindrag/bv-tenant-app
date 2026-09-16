// Langkah 4 — Add Photo (PRD §10; opsional, maks 5, dikompres di klien): preview besar, strip thumbnail, kamera/galeri.
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, ImagePlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyFooter } from "@/components/ui/shell";
import { PhotoStrip } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { compressImage } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { MAX_PHOTOS, useReportDraft } from "./ReportLayout";

export default function PhotoStep() {
  const { draft, addPhotos, removePhoto } = useReportDraft();
  const nav = useNavigate();
  const toast = useToast();
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const preview = draft.photos.find((p) => p.id === selected) ?? draft.photos[draft.photos.length - 1];

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_PHOTOS - draft.photos.length;
    if (room <= 0) {
      toast.error(`Maksimal ${MAX_PHOTOS} foto.`);
      return;
    }
    setBusy(true);
    try {
      const list = Array.from(files).slice(0, room);
      const blobs = await Promise.all(list.map((f) => compressImage(f)));
      addPhotos(blobs);
      if (list.length < files.length) toast.toast(`Hanya ${room} foto ditambahkan (maks ${MAX_PHOTOS}).`);
    } finally {
      setBusy(false);
      if (camRef.current) camRef.current.value = "";
      if (galRef.current) galRef.current.value = "";
    }
  }

  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className={cn("relative flex min-h-[320px] flex-1 items-center justify-center bg-neutral-100", preview && "bg-black")}>
          {preview ? (
            <img src={preview.url} alt="Foto laporan" className="max-h-[52dvh] w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-3 px-8 text-center text-neutral-500">
              <Camera size={64} strokeWidth={1.2} className="text-neutral-300" />
              <div className="text-[15px]">Foto kondisi yang perlu diperbaiki. Anda bisa menambahkan hingga {MAX_PHOTOS} foto.</div>
              <div className="mt-2 flex gap-3">
                <Button variant="soft" size="sm" onClick={() => camRef.current?.click()} loading={busy}>
                  <Camera size={16} /> Kamera
                </Button>
                <Button variant="outline" size="sm" onClick={() => galRef.current?.click()} disabled={busy}>
                  <ImagePlus size={16} /> Galeri
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 px-4 pb-2 pt-5">
          <button
            type="button"
            onClick={() => galRef.current?.click()}
            disabled={busy || draft.photos.length >= MAX_PHOTOS}
            className="tap flex h-[130px] w-[100px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-neutral-300 text-neutral-400 disabled:opacity-50"
          >
            <span className="relative">
              <Camera size={44} strokeWidth={1.4} />
              <Plus size={16} strokeWidth={3} className="absolute -right-2 -top-1" />
            </span>
            <span className="text-[13px] font-semibold">tambah foto</span>
          </button>
          <div className="min-w-0 flex-1">
            <PhotoStrip
              photos={draft.photos}
              size={140}
              onRemove={(id) => {
                removePhoto(id);
                if (selected === id) setSelected(null);
              }}
            />
          </div>
        </div>
        {draft.photos.length > 1 && (
          <div className="no-scrollbar flex gap-2 px-4 pb-2">
            {draft.photos.map((p, i) => (
              <button key={p.id} type="button" onClick={() => setSelected(p.id)} className={cn("h-1.5 w-6 rounded-full", preview?.id === p.id ? "bg-brand-500" : "bg-neutral-300")} aria-label={`Foto ${i + 1}`} />
            ))}
          </div>
        )}
      </div>
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFiles(e.target.files)} />
      <input ref={galRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      <StickyFooter className="bg-card/95">
        <Button block size="lg" onClick={() => nav("/report/confirm")} disabled={busy}>
          {draft.photos.length ? "Lanjut" : "Lanjut tanpa foto"}
        </Button>
        {draft.photos.length === 0 && <p className="mt-2 text-center text-xs text-muted-foreground">Foto opsional, tetapi membantu petugas memahami masalah.</p>}
      </StickyFooter>
    </>
  );
}
