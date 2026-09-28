// Bills (PRD P1 v1.3 §23; nav Bills): invoice, periode, jumlah, jatuh tempo, status, riwayat pembayaran. Status pembayaran
// diverifikasi server lewat callback provider — UI tidak pernah menyimpan kredensial pembayaran.
// PRD P4 v2.1 §10: saldo deposit & kredit (P4-TNT-06), statement of account (P4-TNT-03).
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, FileText, PiggyBank, Receipt, Wallet } from "lucide-react";
import { api } from "@/api";
import type { Invoice } from "@/api/types";
import { Page, TabHeader } from "@/components/ui/shell";
import { EmptyState, ErrorState, Skeleton, StatusBadge } from "@/components/ui/misc";
import { errorMessage } from "@/lib/http";
import { fmtDate, fmtRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

export const INVOICE_TYPE: Record<string, string> = { service_charge: "Service charge", utility: "Utilitas", rental: "Sewa", facility: "Fasilitas", deposit: "Deposit / booking fee", other: "Lainnya" };

export function periodLabel(inv: Invoice): string {
  if (inv.period_start && inv.period_end) {
    const s = new Date(inv.period_start);
    const e = new Date(inv.period_end);
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) return s.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    return `${fmtDate(inv.period_start)} – ${fmtDate(inv.period_end)}`;
  }
  return inv.description ?? INVOICE_TYPE[inv.invoice_type] ?? inv.invoice_type;
}

export default function BillsPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState<"open" | "all">("open");
  const summary = useQuery({ queryKey: ["bills", "summary"], queryFn: () => api().billSummary() });
  const bills = useQuery({ queryKey: ["bills", "list", tab], queryFn: () => api().bills({ open: tab === "open" }), refetchInterval: 30_000 });
  const payments = useQuery({ queryKey: ["payments", "all"], queryFn: () => api().payments(), enabled: tab === "all" });
  const balances = useQuery({ queryKey: ["bills", "balances"], queryFn: () => api().balances(), staleTime: 60_000 });

  return (
    <Page bottomNav>
      <TabHeader title="Bills" subtitle="Tagihan & riwayat pembayaran" />
      <div className="px-4 pt-1">
        <div className="rounded-2xl bg-gradient-brand p-5 text-white shadow-float">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-white/90">
            <Wallet size={16} /> Total belum dibayar
          </div>
          <div className="mt-1 text-[30px] font-extrabold">{summary.data ? fmtRupiah(summary.data.outstanding_amount) : <Skeleton className="h-9 w-40 bg-white/30" />}</div>
          {summary.data && (
            <div className="mt-1 text-[13px] text-white/90">
              {summary.data.overdue_count > 0 ? `${summary.data.overdue_count} tagihan melewati jatuh tempo` : summary.data.next_due_at ? `Jatuh tempo berikutnya ${fmtDate(summary.data.next_due_at)}` : "Tidak ada tagihan tertunggak"}
            </div>
          )}
        </div>
        {balances.data && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <BalanceTile label="Deposit" value={balances.data.deposit_balance} hint="Dana jaminan yang tercatat" />
            <BalanceTile label="Saldo kredit" value={balances.data.credit_balance} hint="Kelebihan bayar / koreksi, dipakai untuk tagihan berikutnya" />
          </div>
        )}
        <button type="button" onClick={() => nav("/bills/statement")} className="tap mt-3 flex w-full items-center gap-3 rounded-xl bg-card p-3.5 text-left shadow-card">
          <FileText size={20} className="text-brand-600" />
          <span className="flex-1">
            <span className="block text-[14px] font-bold">Statement tagihan</span>
            <span className="block text-[12px] text-neutral-500">Riwayat tagihan, pembayaran & saldo · unduh PDF</span>
          </span>
          <ChevronRight size={18} className="text-neutral-400" />
        </button>
        <div className="mt-4 flex gap-2">
          {(["open", "all"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={cn("rounded-full px-4 py-1.5 text-[13px] font-semibold", tab === t ? "bg-brand-600 text-white" : "bg-card text-neutral-text shadow-card")}>
              {t === "open" ? "Belum dibayar" : "Semua & riwayat"}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {bills.isLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-[76px] rounded-xl" />)
          ) : bills.error ? (
            <ErrorState message={errorMessage(bills.error)} onRetry={() => bills.refetch()} />
          ) : !bills.data?.length ? (
            <EmptyState icon={<Wallet size={48} />} title={tab === "open" ? "Tidak ada tagihan tertunggak" : "Belum ada tagihan"} />
          ) : (
            bills.data.map((b) => (
              <button key={b.id} type="button" onClick={() => nav(`/bills/${b.id}`)} className="tap flex items-center gap-3 rounded-xl bg-card p-4 text-left shadow-card">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-bold">{periodLabel(b)}</span>
                    <StatusBadge status={b.status} objectType="invoice" />
                  </div>
                  <div className="text-[12px] text-neutral-500">
                    {INVOICE_TYPE[b.invoice_type] ?? b.invoice_type} · {b.invoice_number} · jatuh tempo {fmtDate(b.due_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[15px] font-bold text-neutral-800">{fmtRupiah(b.outstanding_amount > 0 ? b.outstanding_amount : b.total_amount)}</div>
                  {b.paid_amount > 0 && b.outstanding_amount > 0 && <div className="text-[10px] text-neutral-500">dari {fmtRupiah(b.total_amount)}</div>}
                </div>
                <ChevronRight size={18} className="text-neutral-400" />
              </button>
            ))
          )}
        </div>
        {tab === "all" && (payments.data ?? []).length > 0 && (
          <>
            <h2 className="mb-2 mt-6 text-[15px] font-bold">Riwayat pembayaran</h2>
            <div className="flex flex-col gap-2 pb-4">
              {(payments.data ?? []).map((p) => (
                <button key={p.id} type="button" onClick={() => nav(`/bills/${p.invoice_id}?payment=${p.id}`)} className="tap flex items-center gap-3 rounded-xl bg-card p-3 text-left shadow-card">
                  <Receipt size={20} className="text-brand-600" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold">{p.invoice_number} · {p.payment_number}</div>
                    <div className="text-[11px] text-neutral-500">{fmtDate(p.paid_at ?? p.created_at)} · {p.provider_code} / {p.method}</div>
                  </div>
                  <div className="text-[13px] font-bold">{fmtRupiah(p.amount)}</div>
                  <StatusBadge status={p.status} objectType="payment" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Page>
  );
}

function BalanceTile({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-xl bg-card p-3 shadow-card" title={hint}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-neutral-500">
        <PiggyBank size={14} className="text-brand-600" /> {label}
      </div>
      <div className="mt-0.5 text-[16px] font-extrabold text-neutral-800">{fmtRupiah(value)}</div>
    </div>
  );
}
