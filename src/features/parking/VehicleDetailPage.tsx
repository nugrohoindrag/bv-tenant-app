// Detail kendaraan (P3-PRK-01; GET /tenant/vehicles/{id}): identitas kendaraan, status izin, dokumen STNK/foto (hanya untuk pemilik
// kendaraan — server mengirim `documents` bila `is_mine`), riwayat izin, ajukan izin, ubah data, dan hapus (nonaktifkan; izin yang
// masih menunggu ikut dibatalkan server).
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bike, Car, FileCheck2, Pencil, Ticket, Trash2, Upload } from "lucide-react";
import { api } from "@/api";
import type { Vehicle } from "@/api/types";
import { Button } from "@/components/ui/button";
import { DetailRow, Section } from "@/components/ui/controls";
import { Page, StickyFooter, TopBar } from "@/components/ui/shell";
import { Dialog, ErrorState, Skeleton, StatusBadge } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { AttachmentList, FilePicker, type PickedFile } from "@/components/attachments";
import { errorMessage } from "@/lib/http";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { PERMIT_TYPE, VEHICLE_TYPE } from "@/lib/labels";
import { canRequestPermit, permitValidity } from "./ParkingPage";

export default function VehicleDetailPage() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: ["vehicles", id], queryFn: () => api().vehicle(id) });
  if (q.error)
    return (
      <Page>
        <TopBar title="Kendaraan" />
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      </Page>
    );
  if (!q.data)
    return (
      <Page>
        <TopBar title="Kendaraan" />
        <div className="p-4">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </Page>
    );
  return <VehicleDetail v={q.data} />;
}

function VehicleDetail({ v }: { v: Vehicle }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [doc, setDoc] = useState<PickedFile[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const Icon = v.vehicle_type === "motorcycle" || v.vehicle_type === "bicycle" ? Bike : Car;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["vehicles"] });
    qc.invalidateQueries({ queryKey: ["parking-permits"] });
  };
  const upload = useMutation({
    mutationFn: (file: PickedFile) => api().uploadVehicleDocument(v.id, file.blob),
    onSuccess: () => {
      setDoc([]);
      refresh();
      toast.success("Dokumen STNK diunggah.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => api().removeVehicle(v.id),
    onSuccess: () => {
      refresh();
      toast.success("Kendaraan dihapus.");
      nav("/parking", { replace: true });
    },
    onError: (e) => {
      setConfirmDelete(false);
      toast.error(errorMessage(e));
    },
  });
  const docs = v.documents ?? [];

  return (
    <Page className="bg-neutral-100 pb-28">
      <TopBar title={v.plate_number} right={<button type="button" aria-label="Hapus kendaraan" onClick={() => setConfirmDelete(true)} className="tap p-2 text-critical"><Trash2 size={20} /></button>} />
      <div className="space-y-3 p-4 fade-up">
        <section className="rounded-2xl bg-card p-4 shadow-card">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-sky text-white">
              <Icon size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[20px] font-extrabold tracking-wide text-neutral-800">{v.plate_number}</div>
              <div className="truncate text-[12px] text-neutral-500">{[VEHICLE_TYPE[v.vehicle_type] ?? v.vehicle_type, v.brand, v.color].filter(Boolean).join(" · ")}</div>
            </div>
          </div>
          <div className="mt-3 text-[12px]">
            {v.permit_valid ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-success-soft px-1.5 py-0.5 font-semibold text-success-text">
                <FileCheck2 size={12} /> Izin aktif{v.permit_until ? ` s.d. ${fmtDate(v.permit_until)}` : ""}
              </span>
            ) : (
              <span className="text-neutral-500">Belum ada izin parkir aktif</span>
            )}
          </div>
          <div className="mt-2">
            <DetailRow label="Unit" value={v.unit_name} />
            <DetailRow label="Pemilik" value={v.is_mine ? "Anda" : "Anggota tenant lain"} />
          </div>
        </section>

        <Section title="Foto / dokumen STNK">
          {!v.is_mine ? (
            <p className="text-[13px] text-neutral-500">Dokumen kendaraan hanya dapat dilihat oleh pemilik kendaraan{v.document_count > 0 ? ` (${v.document_count} dokumen terlampir)` : ""}.</p>
          ) : (
            <>
              {docs.length > 0 ? (
                <>
                  <AttachmentList items={docs} size={96} className="mb-2" />
                  <ul className="mb-2 space-y-0.5 text-[11px] text-neutral-500">
                    {docs.map((d) => (
                      <li key={d.id} className="truncate">
                        {d.file_name ?? (d.attachment_type === "photo" ? "Foto" : "Dokumen")} · diunggah {fmtDateTime(d.uploaded_at)}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mb-2 text-[13px] text-neutral-500">Belum ada dokumen. Unggah foto/PDF STNK agar petugas parkir dapat memverifikasi kendaraan.</p>
              )}
              <FilePicker files={doc} onChange={setDoc} max={1} allowPdf label="Pilih foto / PDF STNK" onRejected={(m) => toast.error(m.join(", "))} />
              {doc.length > 0 && (
                <Button block size="sm" className="mt-2" loading={upload.isPending} onClick={() => upload.mutate(doc[0]!)}>
                  <Upload size={16} /> Unggah dokumen
                </Button>
              )}
              <p className="mt-2 text-[11px] text-neutral-500">Dokumen hanya dapat dilihat Anda dan petugas parkir/security.</p>
            </>
          )}
        </Section>

        <Section title="Izin parkir">
          {v.permits.length === 0 ? (
            <p className="text-[13px] text-neutral-500">Belum ada izin untuk kendaraan ini.</p>
          ) : (
            <ul className="divide-y divide-border">
              {v.permits.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => nav(`/parking/permits/${p.id}`)} className="tap flex w-full items-center justify-between gap-2 py-2 text-left">
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold">
                        {p.permit_number} · {PERMIT_TYPE[p.permit_type] ?? p.permit_type}
                      </span>
                      <span className="block truncate text-[11px] text-neutral-500">{permitValidity(p)}</span>
                    </span>
                    <StatusBadge status={p.status} objectType="parking_permit" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {canRequestPermit(v) && (
            <Button block size="sm" variant="soft" className="mt-3" onClick={() => nav(`/parking/permits/new?vehicle=${v.id}`)}>
              <Ticket size={16} /> Ajukan izin parkir
            </Button>
          )}
        </Section>
      </div>
      <StickyFooter>
        <Button block size="lg" variant="outline" onClick={() => nav(`/parking/vehicles/${v.id}/edit`)}>
          <Pencil size={16} /> Ubah data kendaraan
        </Button>
      </StickyFooter>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Hapus kendaraan?">
        <p className="text-[14px] text-neutral-700">Permohonan izin yang belum diproses ikut dibatalkan. Kendaraan dengan izin aktif harus dicabut pengelola lebih dulu.</p>
        <div className="mt-4 flex gap-2">
          <Button block variant="outline" onClick={() => setConfirmDelete(false)}>
            Batal
          </Button>
          <Button block variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
            Hapus
          </Button>
        </div>
      </Dialog>
    </Page>
  );
}
