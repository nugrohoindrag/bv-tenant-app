// Statement of account tenant (P4-OUT-02, P4-TNT-03): tagihan, pembayaran, kredit & saldo berjalan per periode; unduh/bagikan PDF
// lewat tautan bertanda tangan (/tenant/statement/link) — dapat dibuka tanpa login (berlaku 72 jam).
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, Download, FileText, Share2 } from "lucide-react";
import { api } from "@/api";
import type { Statement, StatementEntry } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { FilterTabs, Section } from "@/components/ui/controls";
import { Page, StickyFooter, TopBar } from "@/components/ui/shell";
import { Dialog, EmptyState, ErrorState, Skeleton } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/http";
import { fmtDate, fmtRupiah } from "@/lib/format";
import { STATEMENT_KIND } from "@/lib/labels";
import { openSignedDocument, shareLink } from "@/lib/documents";
import { cn } from "@/lib/utils";

type Preset = "3" | "6" | "12" | "ytd";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Rentang tanggal preset (lokal): n bulan ke belakang sampai hari ini, atau awal tahun berjalan. */
export function presetRange(p: Preset, today = new Date()): { from: string; to: string } {
  const to = ymd(today);
  if (p === "ytd") return { from: `${today.getFullYear()}-01-01`, to };
  const f = new Date(today);
  f.setMonth(f.getMonth() - Number(p));
  return { from: ymd(f), to };
}

/** Saldo statement: positif = terutang, negatif = kelebihan bayar (kredit). */
export function balanceLabel(n: number): string {
  if (n > 0) return `${fmtRupiah(n)} terutang`;
  if (n < 0) return `${fmtRupiah(-n)} kelebihan bayar`;
  return "Lunas (Rp 0)";
}

export default function StatementPage() {
  const toast = useToast();
  const [preset, setPreset] = useState<Preset | "custom">("6");
  const [range, setRange] = useState(() => presetRange("6"));
  const invalid = !range.from || !range.to || range.to < range.from;
  const q = useQuery({ queryKey: ["statement", range.from, range.to], queryFn: () => api().statement(range), enabled: !invalid });
  const link = useMutation({ mutationFn: () => api().statementLink(range) });
  // window.open dipanggil sinkron di handler klik (openSignedDocument) — aman dari popup blocker
  const download = () => void openSignedDocument(() => link.mutateAsync()).catch((e) => toast.error(errorMessage(e)));
  // Bagikan dua langkah: ambil tautan dulu, lalu navigator.share dari klik kedua (Safari mewajibkan gesture aktif)
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const prepareShare = () => link.mutate(undefined, { onSuccess: (l) => setShareUrl(l.url), onError: (e) => toast.error(errorMessage(e)) });
  const shareText = `Statement tagihan ${fmtDate(range.from)} – ${fmtDate(range.to)}`;
  return (
    <Page className="bg-neutral-100 pb-28">
      <TopBar title="Statement Tagihan" />
      <div className="space-y-3 p-4">
        <Section>
          <FilterTabs
            value={preset}
            onChange={(p) => {
              setPreset(p);
              if (p !== "custom") setRange(presetRange(p));
            }}
            options={[
              { value: "3", label: "3 bulan" },
              { value: "6", label: "6 bulan" },
              { value: "12", label: "12 bulan" },
              { value: "ytd", label: "Tahun ini" },
              { value: "custom", label: "Pilih tanggal" },
            ]}
          />
          {preset === "custom" && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Input variant="box" label="Dari" type="date" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} />
              <Input variant="box" label="Sampai" type="date" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} />
            </div>
          )}
          {invalid && <p className="mt-2 text-[12px] text-critical">Tanggal akhir harus sama atau setelah tanggal awal.</p>}
        </Section>
        {invalid ? null : q.isLoading ? (
          <>
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </>
        ) : q.error ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : q.data ? (
          <StatementView st={q.data} />
        ) : null}
      </div>
      {!invalid && q.data && (
        <StickyFooter>
          <div className="flex gap-2">
            <Button block variant="outline" loading={link.isPending} onClick={prepareShare}>
              <Share2 size={16} /> Bagikan
            </Button>
            <Button block loading={link.isPending} onClick={download}>
              <Download size={16} /> Unduh PDF
            </Button>
          </div>
        </StickyFooter>
      )}
      <Dialog open={!!shareUrl} onClose={() => setShareUrl(null)} title="Bagikan statement">
        <p className="text-[13px] text-neutral-700">Siapa pun yang memegang tautan ini dapat membuka PDF statement selama 72 jam.</p>
        <div className="mt-2 break-all rounded-lg bg-neutral-100 p-2 font-mono text-[11px] text-neutral-600">{shareUrl}</div>
        <div className="mt-4 flex gap-2">
          <Button
            block
            variant="outline"
            onClick={() => {
              if (shareUrl) void navigator.clipboard.writeText(shareUrl).then(() => toast.success("Tautan disalin."), () => toast.error("Gagal menyalin."));
            }}
          >
            <Copy size={16} /> Salin
          </Button>
          <Button
            block
            onClick={() => {
              if (!shareUrl) return;
              void shareLink("Statement tagihan", shareUrl, shareText).then((r) => {
                if (r === "copied") toast.success("Tautan disalin.");
                if (r !== "cancelled") setShareUrl(null);
              });
            }}
          >
            <Share2 size={16} /> Bagikan
          </Button>
        </div>
      </Dialog>
    </Page>
  );
}

function StatementView({ st }: { st: Statement }) {
  const nav = useNavigate();
  return (
    <>
      <section className="rounded-2xl bg-gradient-brand p-5 text-white shadow-float">
        <div className="text-[12px] font-semibold text-white/85">{st.property_name}</div>
        <div className="text-[16px] font-bold">{st.tenant_name ?? st.unit_label ?? "Statement"}</div>
        <div className="text-[12px] text-white/85">
          {fmtDate(st.from)} – {fmtDate(st.to)}
        </div>
        <div className="mt-3 text-[11px] font-semibold uppercase text-white/80">Saldo akhir</div>
        <div className="text-[26px] font-extrabold leading-tight">{balanceLabel(st.closing_balance)}</div>
      </section>
      <Section>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
          <Stat label="Saldo awal" value={fmtRupiah(st.opening_balance)} />
          <Stat label="Tagihan periode ini" value={fmtRupiah(st.total_debit)} />
          <Stat label="Pembayaran & kredit" value={fmtRupiah(st.total_credit)} />
          <Stat label="Belum dibayar saat ini" value={fmtRupiah(st.outstanding_amount)} strong={st.outstanding_amount > 0} />
          <Stat label="Saldo kredit" value={fmtRupiah(st.credit_balance)} />
          <Stat label="Deposit" value={fmtRupiah(st.deposit_balance)} />
        </dl>
      </Section>
      <Section title={`Transaksi (${st.entries.length})`}>
        {st.entries.length === 0 ? (
          <EmptyState icon={<FileText size={40} />} title="Tidak ada transaksi" description="Tidak ada tagihan atau pembayaran pada periode ini." />
        ) : (
          <ul className="divide-y divide-border">
            {st.entries.map((e, i) => (
              <li key={`${e.object_id}-${e.kind}-${i}`}>
                <EntryRow e={e} onOpen={e.object_type === "invoice" ? () => nav(`/bills/${e.object_id}`) : undefined} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

function EntryRow({ e, onOpen }: { e: StatementEntry; onOpen?: () => void }) {
  const Tag = onOpen ? "button" : "div";
  return (
    <Tag type={onOpen ? "button" : undefined} onClick={onOpen} className={cn("flex w-full items-start gap-3 py-2.5 text-left", onOpen && "tap")}>
      <div className="w-[52px] shrink-0 text-[11px] text-neutral-500">{fmtDate(e.date).replace(/ \d{4}$/, "")}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-neutral-800">{STATEMENT_KIND[e.kind] ?? e.kind}{e.reference ? ` · ${e.reference}` : ""}</div>
        <div className="line-clamp-2 text-[11px] text-neutral-500">{e.description}</div>
      </div>
      <div className="shrink-0 text-right">
        {e.debit > 0 && <div className="text-[13px] font-bold text-neutral-800">+{fmtRupiah(e.debit)}</div>}
        {e.credit > 0 && <div className="text-[13px] font-bold text-success-text">−{fmtRupiah(e.credit)}</div>}
        <div className="text-[10px] text-neutral-500">Saldo {fmtRupiah(e.balance)}</div>
      </div>
    </Tag>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] text-neutral-500">{label}</dt>
      <dd className={cn("font-bold text-neutral-800", strong && "text-warning-text")}>{value}</dd>
    </div>
  );
}
