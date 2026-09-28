// Detail tagihan + pembayaran (PRD §23, WF-P1-006; PRD P4 v2.1 §10): Bills → Invoice → Pay → (transfer manual: unggah bukti →
// verifikasi Finance) → Paid → Kwitansi. Pembayaran per invoice difilter server (B-14); invoice & kwitansi PDF dibuka lewat
// tautan bertanda tangan (P4-TNT-03); bukti transfer foto/PDF (P4-TNT-02, P4-VRF-02). Status pembayaran dipoll dari server.
import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, CreditCard, Download, ExternalLink, FileCheck2, Receipt, Upload } from "lucide-react";
import { api } from "@/api";
import type { Payment, PaymentProvider } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Page, StickyFooter, TopBar } from "@/components/ui/shell";
import { ErrorState, Sheet, Skeleton, StatusBadge } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { AttachmentList, FilePicker, type PickedFile } from "@/components/attachments";
import { errorMessage, isApiError } from "@/lib/http";
import { fmtDate, fmtDateTime, fmtRupiah } from "@/lib/format";
import { useDocumentOpener } from "@/lib/documents";
import { cn } from "@/lib/utils";
import { INVOICE_TYPE, periodLabel } from "./BillsPage";

const METHOD: Record<string, string> = { transfer: "Transfer bank", va: "Virtual Account", qris: "QRIS", card: "Kartu", ewallet: "E-wallet", cash: "Tunai", checkout: "Halaman pembayaran" };

/** Unggah bukti transfer: sepenuhnya keputusan server (`upload_proof` hanya untuk pemilik pembayaran manual yang menunggu). */
export function canUploadProof(p: Pick<Payment, "allowed_actions">): boolean {
  return !!p.allowed_actions?.includes("upload_proof");
}

/** Kwitansi hanya untuk pembayaran paid/refunded (`download_receipt`); selain itu server menjawab 409 RECEIPT_NOT_AVAILABLE. */
export function canDownloadReceipt(p: Pick<Payment, "allowed_actions">): boolean {
  return !!p.allowed_actions?.includes("download_receipt");
}

export function receiptErrorMessage(e: unknown): string {
  return isApiError(e) && e.code === "RECEIPT_NOT_AVAILABLE" ? "Kwitansi belum tersedia. Kwitansi terbit setelah pembayaran diverifikasi." : errorMessage(e);
}

export default function BillDetailPage() {
  const { id = "" } = useParams();
  const [sp, setSp] = useSearchParams();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ["bills", id], queryFn: () => api().bill(id), refetchInterval: 20_000 });
  const pays = useQuery({ queryKey: ["payments", id], queryFn: () => api().payments(id), refetchInterval: 15_000 });
  const providers = useQuery({ queryKey: ["payment-providers"], queryFn: () => api().paymentProviders(), staleTime: 5 * 60_000 });
  const [payOpen, setPayOpen] = useState(false);
  const [sel, setSel] = useState<{ provider: PaymentProvider; method: string } | null>(null);
  // pembayaran yang ditampilkan: pilihan pengguna atau deep link notifikasi (?payment=)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // respons POST /tenant/invoices/{id}/payments sudah membawa allowed_actions (mis. upload_proof) → tampil langsung
  const [created, setCreated] = useState<Payment | null>(null);
  const paramId = sp.get("payment");
  const openId = selectedId ?? paramId;
  const inList = pays.data?.find((p) => p.id === openId);
  const fresh = created?.id === openId ? created : null;
  const single = useQuery({ queryKey: ["payments", "one", openId], queryFn: () => api().payment(openId!), enabled: !!openId && !!pays.data && !inList && !fresh });
  const shown = openId ? (inList ?? fresh ?? single.data ?? null) : null;
  const closePayment = () => {
    setSelectedId(null);
    if (paramId) setSp({}, { replace: true });
  };
  const pay = useMutation({
    mutationFn: () => api().payBill(id, sel!.provider.code, sel!.method),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["bills"] });
      setPayOpen(false);
      setCreated(p);
      setSelectedId(p.id);
      if (p.checkout_url) window.open(p.checkout_url, "_blank", "noopener");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const pdf = useDocumentOpener((e) => toast.error(errorMessage(e)));
  const inv = q.data;
  const pending = (pays.data ?? []).find((p) => ["initiated", "pending"].includes(p.status));
  if (q.error)
    return (
      <Page>
        <TopBar title="Tagihan" />
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      </Page>
    );

  return (
    <Page className="bg-neutral-100 pb-28">
      <TopBar title={inv?.invoice_number ?? "Tagihan"} />
      {!inv ? (
        <div className="p-4">
          <Skeleton className="h-60" />
        </div>
      ) : (
        <div className="space-y-3 p-4 fade-up">
          <section className="rounded-2xl bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold uppercase text-neutral-500">{INVOICE_TYPE[inv.invoice_type] ?? inv.invoice_type}</div>
                <div className="text-[17px] font-bold text-neutral-800">{periodLabel(inv)}</div>
                {inv.unit_label && <div className="text-[12px] text-neutral-500">{inv.unit_label}</div>}
              </div>
              <StatusBadge status={inv.status} objectType="invoice" />
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="text-[11px] text-neutral-500">{inv.outstanding_amount > 0 ? "Sisa tagihan" : "Total"}</div>
                <div className="text-[26px] font-extrabold text-neutral-800">{fmtRupiah(inv.outstanding_amount > 0 ? inv.outstanding_amount : inv.total_amount)}</div>
              </div>
              <div className="text-right text-[12px] text-neutral-500">
                <div>Jatuh tempo</div>
                <div className={cn("font-semibold", inv.status === "overdue" ? "text-critical" : "text-neutral-800")}>{fmtDate(inv.due_at)}</div>
                {!!inv.days_overdue && inv.days_overdue > 0 && <div className="font-semibold text-critical">lewat {inv.days_overdue} hari</div>}
              </div>
            </div>
            {inv.paid_at && <div className="mt-2 text-[12px] text-success-text">Lunas {fmtDateTime(inv.paid_at)}</div>}
            {inv.description && <p className="mt-2 text-[12px] text-neutral-600">{inv.description}</p>}
            {inv.status === "cancelled" && inv.cancel_reason && <p className="mt-2 rounded-md bg-neutral-100 px-3 py-2 text-[12px] text-neutral-700">Dibatalkan: {inv.cancel_reason}</p>}
            {inv.allowed_actions.includes("download_pdf") && (
              <Button size="sm" variant="soft" className="mt-3" loading={pdf.busy} onClick={() => pdf.open(() => api().invoiceDocumentLink(id))}>
                <Download size={16} /> Unduh invoice PDF
              </Button>
            )}
          </section>

          <section className="rounded-2xl bg-card p-4 shadow-card">
            <h2 className="mb-2 text-[14px] font-bold">Rincian</h2>
            <ul className="divide-y divide-border text-[13px]">
              {inv.items.map((it, i) => (
                <li key={it.id ?? i} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-neutral-800">{it.description}</div>
                    {it.quantity !== 1 && (
                      <div className="text-[11px] text-neutral-500">
                        {it.quantity} {it.unit ?? ""} × {fmtRupiah(it.unit_price)}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 font-semibold">{fmtRupiah(it.amount)}</div>
                </li>
              ))}
              {inv.tax_amount > 0 && (
                <li className="flex justify-between py-2 text-neutral-600">
                  <span>Pajak</span>
                  <span>{fmtRupiah(inv.tax_amount)}</span>
                </li>
              )}
              <li className="flex justify-between py-2 font-bold">
                <span>Total</span>
                <span>{fmtRupiah(inv.total_amount)}</span>
              </li>
              {inv.paid_amount > 0 && (
                <li className="flex justify-between py-2 text-success-text">
                  <span>Sudah dibayar</span>
                  <span>{fmtRupiah(inv.paid_amount)}</span>
                </li>
              )}
              {!!inv.credited_amount && inv.credited_amount > 0 && (
                <li className="flex justify-between py-2 text-success-text">
                  <span>Koreksi / kredit</span>
                  <span>−{fmtRupiah(inv.credited_amount)}</span>
                </li>
              )}
              {!!inv.penalty_accrued && inv.penalty_accrued > 0 && (
                <li className="flex justify-between py-2 text-critical">
                  <span>Denda berjalan</span>
                  <span>{fmtRupiah(inv.penalty_accrued)}</span>
                </li>
              )}
            </ul>
          </section>

          {pays.isLoading ? (
            <Skeleton className="h-24 rounded-2xl" />
          ) : pays.error ? (
            <ErrorState message={errorMessage(pays.error)} onRetry={() => pays.refetch()} />
          ) : (pays.data ?? []).length > 0 ? (
            <section className="rounded-2xl bg-card p-4 shadow-card">
              <h2 className="mb-2 text-[14px] font-bold">Pembayaran</h2>
              <ul className="divide-y divide-border">
                {(pays.data ?? []).map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => setSelectedId(p.id)} className="tap flex w-full items-center gap-3 py-2 text-left">
                      <Receipt size={18} className="text-brand-600" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold">
                          {p.payment_number} · {METHOD[p.method] ?? p.method}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {fmtDateTime(p.paid_at ?? p.created_at)}
                          {p.receipt_number ? ` · kuitansi ${p.receipt_number}` : ""}
                          {p.proof_count ? ` · ${p.proof_count} bukti` : ""}
                        </div>
                      </div>
                      <span className="text-[13px] font-bold">{fmtRupiah(p.amount)}</span>
                      <StatusBadge status={p.status} objectType="payment" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}

      {inv && inv.outstanding_amount > 0 && inv.allowed_actions.includes("pay") && !pending && providers.data && providers.data.filter((p) => p.is_active).length === 0 && (
        <StickyFooter>
          <p className="rounded-xl bg-neutral-100 px-4 py-3 text-center text-[13px] text-neutral-600">Pembayaran online belum tersedia. Silakan bayar sesuai instruksi building management; status akan diperbarui setelah verifikasi.</p>
        </StickyFooter>
      )}
      {inv && inv.outstanding_amount > 0 && inv.allowed_actions.includes("pay") && (pending || (providers.data?.filter((p) => p.is_active).length ?? 0) > 0) && (
        <StickyFooter>
          {pending ? (
            <Button block size="lg" variant="soft" onClick={() => setSelectedId(pending.id)}>
              {canUploadProof(pending) ? <Upload size={18} /> : <CreditCard size={18} />} {canUploadProof(pending) ? "Instruksi & unggah bukti transfer" : "Lihat instruksi pembayaran"}
            </Button>
          ) : (
            <Button block size="lg" onClick={() => setPayOpen(true)}>
              <CreditCard size={18} /> Bayar {fmtRupiah(inv.outstanding_amount)}
            </Button>
          )}
        </StickyFooter>
      )}

      <Sheet open={payOpen} onClose={() => setPayOpen(false)} title="Pilih metode pembayaran">
        {providers.isLoading ? (
          <Skeleton className="h-24" />
        ) : (
          <ul className="space-y-2">
            {(providers.data ?? [])
              .filter((p) => p.is_active)
              .flatMap((p) => p.methods.map((m) => ({ p, m })))
              .map(({ p, m }) => (
                <li key={p.code + m}>
                  <button type="button" onClick={() => setSel({ provider: p, method: m })} className={cn("tap flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left", sel?.provider.code === p.code && sel.method === m ? "border-brand-500 bg-brand-50/50" : "border-border")}>
                    <CreditCard size={20} className="text-brand-600" />
                    <div className="flex-1">
                      <div className="text-[14px] font-bold">{METHOD[m] ?? m}</div>
                      <div className="text-[12px] text-neutral-500">
                        {p.name}
                        {p.code === "manual" ? " · unggah bukti transfer, diverifikasi building management" : ""}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            {(providers.data ?? []).filter((p) => p.is_active).length === 0 && <li className="text-[13px] text-neutral-500">Belum ada metode pembayaran aktif. Hubungi building management.</li>}
          </ul>
        )}
        <Button block className="mt-4" disabled={!sel} loading={pay.isPending} onClick={() => pay.mutate()}>
          Lanjutkan pembayaran
        </Button>
        <p className="mt-2 text-center text-[11px] text-neutral-500">BuildingVision tidak menyimpan data kartu/rekening Anda. Status diperbarui setelah verifikasi.</p>
      </Sheet>

      <Sheet open={!!openId} onClose={closePayment} title="Pembayaran" className="max-h-[90dvh] overflow-y-auto">
        {shown ? <PaymentPanel p={shown} /> : single.error ? <ErrorState message={errorMessage(single.error)} /> : <Skeleton className="h-40" />}
      </Sheet>
    </Page>
  );
}

function PaymentPanel({ p }: { p: Payment }) {
  const toast = useToast();
  const qc = useQueryClient();
  const upload = canUploadProof(p);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const proofs = useQuery({ queryKey: ["payment-proofs", p.id], queryFn: () => api().paymentProofs(p.id), enabled: upload || (p.proof_count ?? 0) > 0 });
  const send = useMutation({
    mutationFn: async () => {
      for (const f of files) await api().uploadPaymentProof(p.id, f.blob, f.name);
    },
    onSuccess: () => {
      setFiles([]);
      qc.invalidateQueries({ queryKey: ["payment-proofs", p.id] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Bukti transfer terkirim. Finance akan memverifikasi pembayaran Anda.");
    },
    onError: (e) => {
      qc.invalidateQueries({ queryKey: ["payment-proofs", p.id] });
      toast.error(errorMessage(e));
    },
  });
  const receipt = useDocumentOpener((e) => {
    toast.error(receiptErrorMessage(e));
    // status berubah di server (mis. refund dibatalkan) → segarkan allowed_actions
    if (isApiError(e) && e.status === 409) qc.invalidateQueries({ queryKey: ["payments"] });
  });
  const copy = (v: string) => navigator.clipboard.writeText(v).then(() => toast.success("Disalin."));
  return (
    <div className="space-y-3 text-[13px]">
      <div className="flex items-center justify-between">
        <span className="text-neutral-500">
          {p.payment_number} · {METHOD[p.method] ?? p.method}
        </span>
        <StatusBadge status={p.status} objectType="payment" />
      </div>
      <div className="text-[24px] font-extrabold">{fmtRupiah(p.amount)}</div>
      {p.va_number && (
        <div className="rounded-xl bg-neutral-100 p-3">
          <div className="text-[11px] text-neutral-500">Nomor Virtual Account</div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[18px] font-bold tracking-wider">{p.va_number}</span>
            <button type="button" onClick={() => copy(p.va_number!)} aria-label="Salin" className="tap p-1 text-brand-600">
              <Copy size={18} />
            </button>
          </div>
        </div>
      )}
      {p.qr_string && (
        <div className="rounded-xl bg-neutral-100 p-3">
          <div className="text-[11px] text-neutral-500">QRIS</div>
          <div className="break-all font-mono text-[11px]">{p.qr_string}</div>
        </div>
      )}
      {p.checkout_url && (
        <a href={p.checkout_url} target="_blank" rel="noopener" className="flex items-center justify-center gap-2 rounded-full bg-brand-600 py-2.5 font-semibold text-white">
          <ExternalLink size={16} /> Buka halaman pembayaran
        </a>
      )}
      {p.instructions && <p className="whitespace-pre-line text-neutral-700">{p.instructions}</p>}
      {p.expires_at && ["initiated", "pending"].includes(p.status) && <p className="text-[12px] text-neutral-500">Selesaikan sebelum {fmtDateTime(p.expires_at)}.</p>}
      {p.status === "paid" && (
        <p className="text-success-text">
          Pembayaran terverifikasi{p.paid_at ? ` ${fmtDateTime(p.paid_at)}` : ""}
          {p.receipt_number ? ` · kuitansi ${p.receipt_number}` : ""}.
        </p>
      )}
      {p.status === "failed" && <p className="text-critical">Gagal: {p.failure_reason ?? "—"}</p>}
      {p.status === "refunded" && <p className="text-neutral-600">Dikembalikan{p.refund_reason ? `: ${p.refund_reason}` : ""}.</p>}

      {canDownloadReceipt(p) && (
        <Button block variant="soft" loading={receipt.busy} onClick={() => receipt.open(() => api().receiptDocumentLink(p.id))}>
          <Download size={16} /> Unduh kwitansi PDF
        </Button>
      )}

      {(upload || (proofs.data?.length ?? 0) > 0) && (
        <div className="rounded-xl border border-border p-3">
          <div className="mb-2 flex items-center gap-2 font-bold">
            <FileCheck2 size={16} className="text-brand-600" /> Bukti transfer
          </div>
          {proofs.isLoading ? (
            <Skeleton className="h-16" />
          ) : proofs.data?.length ? (
            <AttachmentList items={proofs.data} size={72} className="mb-2" />
          ) : (
            <p className="mb-2 text-[12px] text-neutral-500">Belum ada bukti. Unggah foto struk/bukti transfer atau PDF agar Finance dapat memverifikasi.</p>
          )}
          {upload && (
            <>
              <FilePicker files={files} onChange={setFiles} max={3} allowPdf label="Pilih foto / PDF bukti" onRejected={(m) => toast.error(m.join(", "))} />
              {files.length > 0 && (
                <Button block size="sm" className="mt-2" loading={send.isPending} onClick={() => send.mutate()}>
                  <Upload size={16} /> Kirim {files.length} bukti
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
