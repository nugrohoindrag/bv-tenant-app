// Detail tagihan + pembayaran (PRD §23, WF-P1-006): Bills → Invoice → Pay → Payment Gateway → Verified Callback → Paid → Receipt.
// Provider dari server (manual transfer = verifikasi staf; gateway = checkout URL / VA / QRIS). Status pembayaran dipoll dari server.
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, CreditCard, ExternalLink, Receipt } from "lucide-react";
import { api } from "@/api";
import type { Payment, PaymentProvider } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Page, StickyFooter, TopBar } from "@/components/ui/shell";
import { ErrorState, Sheet, Skeleton, StatusBadge } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/http";
import { fmtDate, fmtDateTime, fmtRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { INVOICE_TYPE, periodLabel } from "./BillsPage";

const METHOD: Record<string, string> = { transfer: "Transfer bank", va: "Virtual Account", qris: "QRIS", card: "Kartu", ewallet: "E-wallet", cash: "Tunai", checkout: "Halaman pembayaran" };

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
  const [showPayment, setShowPayment] = useState<Payment | null>(null);
  const pay = useMutation({
    mutationFn: () => api().payBill(id, sel!.provider.code, sel!.method),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["bills"] });
      setPayOpen(false);
      setShowPayment(p);
      if (p.checkout_url) window.open(p.checkout_url, "_blank", "noopener");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  useEffect(() => {
    const pid = sp.get("payment");
    if (pid && pays.data) {
      const p = pays.data.find((x) => x.id === pid);
      if (p) setShowPayment(p);
      setSp({}, { replace: true });
    }
  }, [sp, pays.data, setSp]);
  const inv = q.data;
  const pending = (pays.data ?? []).find((p) => ["initiated", "pending"].includes(p.status));
  const copy = (v: string) => navigator.clipboard.writeText(v).then(() => toast.success("Disalin."));
  if (q.error) return <Page><TopBar title="Tagihan" /><ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /></Page>;

  return (
    <Page className="bg-neutral-100 pb-28">
      <TopBar title={inv?.invoice_number ?? "Tagihan"} />
      {!inv ? (
        <div className="p-4"><Skeleton className="h-60" /></div>
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
              </div>
            </div>
            {inv.paid_at && <div className="mt-2 text-[12px] text-success-text">Lunas {fmtDateTime(inv.paid_at)}</div>}
            {inv.description && <p className="mt-2 text-[12px] text-neutral-600">{inv.description}</p>}
          </section>

          <section className="rounded-2xl bg-card p-4 shadow-card">
            <h2 className="mb-2 text-[14px] font-bold">Rincian</h2>
            <ul className="divide-y divide-border text-[13px]">
              {inv.items.map((it, i) => (
                <li key={it.id ?? i} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-neutral-800">{it.description}</div>
                    {it.quantity !== 1 && <div className="text-[11px] text-neutral-500">{it.quantity} {it.unit ?? ""} × {fmtRupiah(it.unit_price)}</div>}
                  </div>
                  <div className="shrink-0 font-semibold">{fmtRupiah(it.amount)}</div>
                </li>
              ))}
              {inv.tax_amount > 0 && <li className="flex justify-between py-2 text-neutral-600"><span>Pajak</span><span>{fmtRupiah(inv.tax_amount)}</span></li>}
              <li className="flex justify-between py-2 font-bold"><span>Total</span><span>{fmtRupiah(inv.total_amount)}</span></li>
              {inv.paid_amount > 0 && <li className="flex justify-between py-2 text-success-text"><span>Sudah dibayar</span><span>{fmtRupiah(inv.paid_amount)}</span></li>}
            </ul>
          </section>

          {(pays.data ?? []).length > 0 && (
            <section className="rounded-2xl bg-card p-4 shadow-card">
              <h2 className="mb-2 text-[14px] font-bold">Pembayaran</h2>
              <ul className="divide-y divide-border">
                {(pays.data ?? []).map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => setShowPayment(p)} className="tap flex w-full items-center gap-3 py-2 text-left">
                      <Receipt size={18} className="text-brand-600" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold">{p.payment_number} · {METHOD[p.method] ?? p.method}</div>
                        <div className="text-[11px] text-neutral-500">{fmtDateTime(p.paid_at ?? p.created_at)}{p.receipt_number ? ` · kuitansi ${p.receipt_number}` : ""}</div>
                      </div>
                      <span className="text-[13px] font-bold">{fmtRupiah(p.amount)}</span>
                      <StatusBadge status={p.status} objectType="payment" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
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
            <Button block size="lg" variant="soft" onClick={() => setShowPayment(pending)}>
              <CreditCard size={18} /> Lihat instruksi pembayaran
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
            {(providers.data ?? []).filter((p) => p.is_active).flatMap((p) => p.methods.map((m) => ({ p, m }))).map(({ p, m }) => (
              <li key={p.code + m}>
                <button type="button" onClick={() => setSel({ provider: p, method: m })} className={cn("tap flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left", sel?.provider.code === p.code && sel.method === m ? "border-brand-500 bg-brand-50/50" : "border-border")}>
                  <CreditCard size={20} className="text-brand-600" />
                  <div className="flex-1">
                    <div className="text-[14px] font-bold">{METHOD[m] ?? m}</div>
                    <div className="text-[12px] text-neutral-500">{p.name}{p.code === "manual" ? " · diverifikasi building management" : ""}</div>
                  </div>
                </button>
              </li>
            ))}
            {(providers.data ?? []).filter((p) => p.is_active).length === 0 && <li className="text-[13px] text-neutral-500">Belum ada metode pembayaran aktif. Hubungi building management.</li>}
          </ul>
        )}
        <Button block className="mt-4" disabled={!sel} loading={pay.isPending} onClick={() => pay.mutate()}>Lanjutkan pembayaran</Button>
        <p className="mt-2 text-center text-[11px] text-neutral-500">BuildingVision tidak menyimpan data kartu/rekening Anda. Status diperbarui setelah verifikasi provider.</p>
      </Sheet>

      <Sheet open={!!showPayment} onClose={() => setShowPayment(null)} title="Instruksi pembayaran">
        {showPayment && (
          <div className="space-y-3 text-[13px]">
            <div className="flex items-center justify-between"><span className="text-neutral-500">{showPayment.payment_number}</span><StatusBadge status={showPayment.status} objectType="payment" /></div>
            <div className="text-[24px] font-extrabold">{fmtRupiah(showPayment.amount)}</div>
            {showPayment.va_number && (
              <div className="rounded-xl bg-neutral-100 p-3">
                <div className="text-[11px] text-neutral-500">Nomor Virtual Account</div>
                <div className="flex items-center justify-between gap-2"><span className="font-mono text-[18px] font-bold tracking-wider">{showPayment.va_number}</span><button type="button" onClick={() => copy(showPayment.va_number!)} aria-label="Salin" className="tap p-1 text-brand-600"><Copy size={18} /></button></div>
              </div>
            )}
            {showPayment.qr_string && <div className="rounded-xl bg-neutral-100 p-3"><div className="text-[11px] text-neutral-500">QRIS</div><div className="break-all font-mono text-[11px]">{showPayment.qr_string}</div></div>}
            {showPayment.checkout_url && <a href={showPayment.checkout_url} target="_blank" rel="noopener" className="flex items-center justify-center gap-2 rounded-full bg-brand-600 py-2.5 font-semibold text-white"><ExternalLink size={16} /> Buka halaman pembayaran</a>}
            {showPayment.instructions && <p className="whitespace-pre-line text-neutral-700">{showPayment.instructions}</p>}
            {showPayment.expires_at && ["initiated", "pending"].includes(showPayment.status) && <p className="text-[12px] text-neutral-500">Selesaikan sebelum {fmtDateTime(showPayment.expires_at)}.</p>}
            {showPayment.status === "paid" && <p className="text-success-text">Pembayaran terverifikasi{showPayment.receipt_number ? ` · kuitansi ${showPayment.receipt_number}` : ""}.</p>}
            {showPayment.status === "failed" && <p className="text-critical">Gagal: {showPayment.failure_reason ?? "—"}</p>}
          </div>
        )}
      </Sheet>
    </Page>
  );
}
