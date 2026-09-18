import { useEffect, useRef, useState } from "react";

export function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** Kompres gambar di browser (canvas): sisi terpanjang <= max px, JPEG q. Mengikuti pipeline foto mobile (<=1600px q80). */
/** Batas ukuran foto yang diterima server (BV_MAX_IMAGE_BYTES, default 500 KB). */
export const MAX_IMAGE_BYTES = 500 * 1024;

/**
 * Kompres foto sampai ≤ MAX_IMAGE_BYTES: skala ≤ max px, lalu turunkan kualitas JPEG bertahap (0.8 → 0.4),
 * lalu perkecil dimensi 0.8× berulang. Non-gambar / gagal decode → file asli (server tetap memvalidasi).
 */
export async function compressImage(file: File | Blob, max = 1600, quality = 0.8, limit = MAX_IMAGE_BYTES): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  let w = bitmap.width;
  let h = bitmap.height;
  const scale = Math.min(1, max / Math.max(w, h));
  w = Math.round(w * scale);
  h = Math.round(h * scale);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  const encode = (q: number) =>
    new Promise<Blob | null>((resolve) => {
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(bitmap, 0, 0, w, h);
      canvas.toBlob((b) => resolve(b), "image/jpeg", q);
    });
  let q = quality;
  let out: Blob | null = null;
  for (let i = 0; i < 12; i++) {
    out = await encode(q);
    if (!out) break;
    if (out.size <= limit) break;
    if (q > 0.4) q = Math.max(0.4, q - 0.1);
    else {
      w = Math.round(w * 0.8);
      h = Math.round(h * 0.8);
    }
  }
  bitmap.close?.();
  return out ?? file;
}

export function useObjectUrls(blobs: Blob[]): string[] {
  const urls = useRef<string[]>([]);
  const [out, setOut] = useState<string[]>([]);
  useEffect(() => {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = blobs.map((b) => URL.createObjectURL(b));
    setOut(urls.current);
    return () => {
      urls.current.forEach((u) => URL.revokeObjectURL(u));
      urls.current = [];
    };
  }, [blobs]);
  return out;
}
