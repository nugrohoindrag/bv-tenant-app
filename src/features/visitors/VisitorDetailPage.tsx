// Detail tamu + Visitor Pass (QR dari qr_payload server; dipindai security saat check-in). Bagikan via Web Share bila tersedia.
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Car, Clock, Share2, Users } from "lucide-react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Page, StickyFooter, TopBar } from "@/components/ui/shell";
import { ErrorState, Sheet, Skeleton, StatusBadge } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/http";
import { fmtDateTime } from "@/lib/format";

export default function VisitorDetailPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ["visitors", id], queryFn: () => api().visitor(id), refetchInterval: 20_000 });
  const v = q.data;
  const [qr, setQr] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  useEffect(() => {
    let alive = true;
    if (v?.pass?.qr_payload) QRCode.toDataURL(v.pass.qr_payload, { width: 280, margin: 1, errorCorrectionLevel: "M" }).then((u) => alive && setQr(u)).catch(() => setQr(null));
    else setQr(null);
    return () => {
      alive = false;
    };
  }, [v?.pass?.qr_payload]);
  const cancel = useMutation({
    mutationFn: () => api().cancelVisitor(id, reason.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visitors"] });
      setCancelOpen(false);
      toast.success("Pendaftaran tamu dibatalkan.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const share = async () => {
    if (!v?.pass) return;
    const text = `Visitor pass ${v.visitor_number} untuk ${v.visitor_name} · kode ${v.pass.pass_code} · berlaku ${fmtDateTime(v.pass.valid_from)} – ${fmtDateTime(v.pass.valid_until)}. Tunjukkan kode ini ke security.`;
    try {
      if (navigator.share) await navigator.share({ title: "Visitor pass", text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("Kode pass disalin.");
      }
    } catch {
      /* dibatalkan pengguna */
    }
  };
  if (q.error) return <Page><TopBar title="Tamu" /><ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /></Page>;
  const passActive = v?.pass && v.pass.status === "active";
  return (
    <Page className="bg-neutral-100 pb-28">
      <TopBar title={v?.visitor_number ?? "Tamu"} right={passActive ? <button type="button" aria-label="Bagikan" onClick={share} className="tap p-2 text-brand-600"><Share2 size={20} /></button> : undefined} />
      {!v ? (
        <div className="p-4"><Skeleton className="h-64" /></div>
      ) : (
        <div className="space-y-3 p-4 fade-up">
          {v.pass && (
            <section className="rounded-2xl bg-card p-5 text-center shadow-card">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Visitor Pass</div>
              {passActive && qr ? <img src={qr} alt="QR visitor pass" className="mx-auto mt-2 h-[220px] w-[220px]" /> : <div className="mx-auto mt-2 flex h-[220px] w-[220px] items-center justify-center rounded-xl bg-neutral-100 text-[13px] text-neutral-500">{v.pass.status === "used" ? "Pass sudah digunakan" : v.pass.status === "revoked" ? "Pass dicabut" : v.pass.status === "expired" ? "Pass kedaluwarsa" : "QR tidak tersedia"}</div>}
              <div className="mt-2 font-mono text-[22px] font-extrabold tracking-widest text-neutral-800">{v.pass.pass_code}</div>
              <div className="text-[12px] text-neutral-500">Berlaku {fmtDateTime(v.pass.valid_from)} – {fmtDateTime(v.pass.valid_until)}</div>
              {v.pass.used_at && <div className="mt-1 text-[12px] text-success-text">Digunakan {fmtDateTime(v.pass.used_at)}</div>}
            </section>
          )}
          <section className="rounded-2xl bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[17px] font-bold text-neutral-800">{v.visitor_name}</div>
                <div className="text-[12px] text-neutral-500">{v.visitor_company ?? ""}{v.visitor_phone ? (v.visitor_company ? " · " : "") + v.visitor_phone : ""}</div>
              </div>
              <StatusBadge status={v.status} objectType="visitor" />
            </div>
            <div className="mt-3 space-y-2 text-[13px] text-neutral-700">
              <div className="flex items-center gap-2"><Clock size={15} className="text-brand-600" /> {fmtDateTime(v.expected_at)}{v.expected_until ? ` – ${fmtDateTime(v.expected_until)}` : ""}</div>
              <div className="flex items-center gap-2"><Users size={15} className="text-brand-600" /> {v.headcount} orang · {v.host_unit_label ?? "—"}</div>
              {v.vehicle_plate && <div className="flex items-center gap-2"><Car size={15} className="text-brand-600" /> {v.vehicle_plate}</div>}
              {v.purpose && <div>Keperluan: <span className="font-semibold">{v.purpose}</span></div>}
              {v.status === "pending_approval" && <p className="rounded-md bg-warning-soft px-3 py-2 text-[12px] text-warning-text">Menunggu persetujuan building management; pass diterbitkan setelah disetujui.</p>}
              {v.status === "denied" && v.denied_reason && <p className="rounded-md bg-critical-soft px-3 py-2 text-[12px] text-critical-text">Ditolak: {v.denied_reason}</p>}
              {v.checked_in_at && <div className="text-[12px] text-neutral-500">Masuk {fmtDateTime(v.checked_in_at)}{v.checked_out_at ? ` · Keluar ${fmtDateTime(v.checked_out_at)}` : ""}</div>}
            </div>
          </section>
        </div>
      )}
      {v?.allowed_actions.includes("cancel") && (
        <StickyFooter>
          <Button block variant="outline" onClick={() => setCancelOpen(true)}>Batalkan pendaftaran</Button>
        </StickyFooter>
      )}
      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title="Batalkan pendaftaran tamu">
        <Textarea variant="box" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan (opsional)" />
        <Button block variant="danger" className="mt-4" loading={cancel.isPending} onClick={() => cancel.mutate()}>Batalkan</Button>
      </Sheet>
    </Page>
  );
}
