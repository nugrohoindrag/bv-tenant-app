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
export async function compressImage(file: File, max = 1600, quality = 0.8): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", quality));
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
