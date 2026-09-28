// Lampiran: pemilih file (foto dikompres ≤ batas server; PDF opsional) & daftar lampiran (thumbnail gambar / tautan dokumen).
// Dipakai pesan permintaan (P3-SRQ-05), bukti transfer (P4-VRF-02), STNK kendaraan (P3-PRK-01), foto feedback (P3-FDB-02).
import { useMemo, useRef } from "react";
import { Camera, FileText, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoStrip } from "@/components/ui/misc";
import { compressImage, useObjectUrls } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/** Batas dokumen (BV_MAX_UPLOAD_BYTES default 10 MB); foto dikompres ke ≤ 500 KB sebelum unggah. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export interface PickedFile {
  blob: Blob;
  name: string;
}

export function isImage(type: string | null | undefined): boolean {
  return !!type && type.startsWith("image/");
}

/** Siapkan file pilihan: gambar dikompres; PDF dipertahankan (ditolak bila > 10 MB); tipe lain diabaikan. */
export async function prepareFiles(files: FileList | File[], allowPdf: boolean): Promise<{ files: PickedFile[]; rejected: string[] }> {
  const out: PickedFile[] = [];
  const rejected: string[] = [];
  for (const f of Array.from(files)) {
    if (isImage(f.type)) out.push({ blob: await compressImage(f), name: f.name.replace(/\.[^.]+$/, "") + ".jpg" });
    else if (allowPdf && f.type === "application/pdf") {
      if (f.size > MAX_DOCUMENT_BYTES) rejected.push(`${f.name} melebihi 10 MB`);
      else out.push({ blob: f, name: f.name });
    } else rejected.push(`${f.name}: format tidak didukung`);
  }
  return { files: out, rejected };
}

export function FilePicker({
  files,
  onChange,
  max = 3,
  allowPdf = false,
  label,
  onRejected,
  className,
}: {
  files: PickedFile[];
  onChange: (files: PickedFile[]) => void;
  max?: number;
  allowPdf?: boolean;
  label?: string;
  onRejected?: (msgs: string[]) => void;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const images = useMemo(() => files.filter((f) => isImage(f.blob.type)), [files]);
  // identitas array harus stabil: useObjectUrls membuat ulang object URL setiap kali array berubah
  const blobs = useMemo(() => images.map((f) => f.blob), [images]);
  const urls = useObjectUrls(blobs);
  const pick = async (list: FileList | null) => {
    if (!list?.length) return;
    const { files: picked, rejected } = await prepareFiles(Array.from(list).slice(0, max - files.length), allowPdf);
    if (rejected.length) onRejected?.(rejected);
    onChange([...files, ...picked].slice(0, max));
    if (ref.current) ref.current.value = "";
  };
  const remove = (f: PickedFile) => onChange(files.filter((x) => x !== f));
  return (
    <div className={className}>
      {images.length > 0 && <PhotoStrip photos={images.map((_, i) => ({ id: String(i), url: urls[i] ?? "" }))} size={96} onRemove={(id) => remove(images[Number(id)]!)} className="mb-2" />}
      {files
        .filter((f) => !isImage(f.blob.type))
        .map((f) => (
          <div key={f.name + f.blob.size} className="mb-2 flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-[12px]">
            <FileText size={16} className="shrink-0 text-brand-600" />
            <span className="min-w-0 flex-1 truncate">{f.name}</span>
            <button type="button" onClick={() => remove(f)} className="font-semibold text-critical">
              Hapus
            </button>
          </div>
        ))}
      <Button type="button" block variant="soft" size="sm" onClick={() => ref.current?.click()} disabled={files.length >= max}>
        {allowPdf ? <Paperclip size={16} /> : <Camera size={16} />} {label ?? (allowPdf ? "Pilih foto / PDF" : "Tambah foto")} ({files.length}/{max})
      </Button>
      <input ref={ref} type="file" accept={allowPdf ? "image/*,application/pdf" : "image/*"} multiple={max > 1} className="hidden" onChange={(e) => pick(e.target.files)} />
    </div>
  );
}

export interface AttachmentItem {
  id: string;
  url?: string;
  thumb_url?: string;
  content_type?: string | null;
  file_name?: string | null;
}

/** Grid lampiran: gambar sebagai thumbnail (tap → buka ukuran penuh), dokumen sebagai tautan. */
export function AttachmentList({ items, size = 88, light, className }: { items: AttachmentItem[]; size?: number; light?: boolean; className?: string }) {
  if (!items.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {items.map((a) =>
        !a.content_type || isImage(a.content_type) ? (
          <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg bg-neutral-200" style={{ width: size, height: size }}>
            {(a.thumb_url || a.url) && <img src={a.thumb_url || a.url} alt={a.file_name ?? "Lampiran"} className="h-full w-full object-cover" loading="lazy" />}
          </a>
        ) : (
          <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className={cn("flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-[12px] font-semibold", light ? "bg-white/20 text-white" : "bg-neutral-100 text-brand-700")}>
            <FileText size={15} className="shrink-0" />
            <span className="truncate">{a.file_name || "Dokumen"}</span>
          </a>
        ),
      )}
    </div>
  );
}
