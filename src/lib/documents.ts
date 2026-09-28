// Dokumen PDF (invoice, kwitansi, statement — PRD P4 v2.1 P4-TNT-03): server memberi tautan bertanda tangan (`document-link`)
// yang dapat dibuka tanpa header Authorization — berfungsi di browser maupun WebView Capacitor (dibuka di browser sistem).
import { useState } from "react";
import type { DocumentLink } from "@/api/types";
import { isNative, openExternal } from "./native";

/**
 * Pembuka dokumen untuk tombol: HARUS dipanggil langsung dari handler klik (bukan lewat useMutation yang menjalankan fungsi
 * setelah await) agar window.open tetap dalam gesture pengguna (Safari/iOS memblokir popup di luar gesture).
 */
export function useDocumentOpener(onError: (e: unknown) => void) {
  const [busy, setBusy] = useState(false);
  const open = (getLink: () => Promise<DocumentLink>) => {
    setBusy(true);
    openSignedDocument(getLink)
      .catch(onError)
      .finally(() => setBusy(false));
  };
  return { busy, open };
}

/**
 * Buka dokumen dari tautan bertanda tangan. Web: jendela dibuka sinkron di dalam gesture klik (hindari popup blocker) lalu
 * diarahkan setelah tautan tersedia; bila jendela diblokir, halaman saat ini yang diarahkan. Native: browser sistem.
 */
export async function openSignedDocument(getLink: () => Promise<DocumentLink>): Promise<DocumentLink> {
  if (isNative) {
    const link = await getLink();
    openExternal(link.url);
    return link;
  }
  const win = typeof window !== "undefined" ? window.open("", "_blank") : null;
  try {
    const link = await getLink();
    if (win && !win.closed) {
      win.opener = null;
      win.location.href = link.url;
    } else {
      window.location.assign(link.url);
    }
    return link;
  } catch (e) {
    win?.close();
    throw e;
  }
}

/** Bagikan tautan (Web Share API) atau salin ke clipboard. */
export async function shareLink(title: string, url: string, text?: string): Promise<"shared" | "copied" | "cancelled"> {
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title, text, url });
      return "shared";
    }
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "cancelled";
  }
}
