// Daftarkan / ubah kendaraan (P3-PRK-01): plat, jenis, merek, warna, unit; foto/PDF STNK opsional saat mendaftar (lampiran object
// vehicle). Plat tidak dapat diubah setelah terdaftar (unik per property). Dokumen, riwayat izin, dan hapus ada di detail kendaraan.
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import { useAuth } from "@/app/auth";
import type { Vehicle, VehicleType } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { ChipGroup, Section } from "@/components/ui/controls";
import { Page, StickyFooter, TopBar } from "@/components/ui/shell";
import { ErrorState, Skeleton } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { FilePicker, type PickedFile } from "@/components/attachments";
import { errorMessage, isApiError } from "@/lib/http";
import { useActiveUnit } from "@/lib/active-unit";
import { VEHICLE_TYPE } from "@/lib/labels";

const TYPES: { value: VehicleType; label: string }[] = (["car", "motorcycle", "truck", "bicycle", "other"] as VehicleType[]).map((v) => ({ value: v, label: VEHICLE_TYPE[v] }));

export function normalizePlate(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trimStart();
}

export default function VehicleFormPage() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ["vehicles", id], queryFn: () => api().vehicle(id!), enabled: !!id });
  if (!id) return <VehicleForm />;
  const v = q.data;
  return q.error ? (
    <Page>
      <TopBar title="Kendaraan" />
      <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
    </Page>
  ) : q.isLoading ? (
    <Page>
      <TopBar title="Kendaraan" />
      <div className="p-4">
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </Page>
  ) : v ? (
    <VehicleForm key={v.id} vehicle={v} />
  ) : (
    <Page>
      <TopBar title="Kendaraan" />
      <ErrorState message="Kendaraan tidak ditemukan atau sudah dihapus." />
    </Page>
  );
}

function VehicleForm({ vehicle }: { vehicle?: Vehicle }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const active = useActiveUnit(user);
  const editing = !!vehicle;
  const [f, setF] = useState({ plate_number: vehicle?.plate_number ?? "", vehicle_type: (vehicle?.vehicle_type ?? "car") as VehicleType, brand: vehicle?.brand ?? "", color: vehicle?.color ?? "", unit_id: vehicle?.unit_location_id ?? active?.id ?? "" });
  const [doc, setDoc] = useState<PickedFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const units = user?.units ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["vehicles"] });
  const onErr = (e: unknown) => {
    if (isApiError(e) && e.problem.errors?.length) setErrors(Object.fromEntries(e.problem.errors.map((x) => [x.field, x.message])));
    toast.error(errorMessage(e));
  };
  const save = useMutation({
    mutationFn: () => {
      const input = { vehicle_type: f.vehicle_type, brand: f.brand, color: f.color, unit_id: f.unit_id || null };
      return editing ? api().updateVehicle(vehicle.id, input) : api().createVehicle({ ...input, plate_number: f.plate_number.trim() }, doc[0]?.blob ?? null);
    },
    onSuccess: (v) => {
      refresh();
      if (editing) {
        toast.success("Kendaraan diperbarui.");
        nav(-1);
      } else {
        toast.success("Kendaraan terdaftar. Ajukan izin parkir bila diperlukan.");
        nav(`/parking/permits/new?vehicle=${v.id}`, { replace: true });
      }
    },
    onError: onErr,
  });
  const submit = () => {
    const err: Record<string, string> = {};
    if (!editing && f.plate_number.replace(/\s/g, "").length < 3) err.plate_number = "Plat nomor wajib diisi";
    setErrors(err);
    if (!Object.keys(err).length) save.mutate();
  };

  return (
    <Page className="bg-neutral-100 pb-28">
      <TopBar title={editing ? `Ubah ${vehicle.plate_number}` : "Daftarkan Kendaraan"} />
      <div className="space-y-3 p-4">
        <Section>
          <div className="space-y-4">
            {editing ? (
              <div>
                <div className="text-[13px] font-semibold text-neutral-text">Plat nomor</div>
                <div className="font-mono text-[20px] font-extrabold tracking-wide">{vehicle.plate_number}</div>
                <div className="text-[11px] text-neutral-500">Plat tidak dapat diubah; hapus lalu daftarkan ulang bila salah.</div>
              </div>
            ) : (
              <Input variant="box" label="Plat nomor" placeholder="B 1234 XYZ" autoCapitalize="characters" value={f.plate_number} onChange={(e) => setF({ ...f, plate_number: normalizePlate(e.target.value) })} error={errors.plate_number} />
            )}
            <ChipGroup label="Jenis kendaraan" value={f.vehicle_type} onChange={(t) => setF({ ...f, vehicle_type: t })} options={TYPES} />
            <div className="grid grid-cols-2 gap-3">
              <Input variant="box" label="Merek / model" placeholder="Toyota Avanza" value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} />
              <Input variant="box" label="Warna" placeholder="Hitam" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} />
            </div>
            {units.length > 1 && <Select variant="box" label="Unit" value={f.unit_id} onChange={(e) => setF({ ...f, unit_id: e.target.value })} options={units.map((u) => ({ value: u.id, label: u.name }))} />}
          </div>
        </Section>

        {!editing && (
          <Section title="Foto / dokumen STNK (opsional)">
            <FilePicker files={doc} onChange={setDoc} max={1} allowPdf label="Pilih foto / PDF STNK" onRejected={(m) => toast.error(m.join(", "))} />
            <p className="mt-2 text-[11px] text-neutral-500">Dokumen hanya dapat dilihat Anda dan petugas parkir/security.</p>
          </Section>
        )}
      </div>
      <StickyFooter>
        <Button block size="lg" loading={save.isPending} onClick={submit}>
          {editing ? "Simpan perubahan" : "Daftarkan kendaraan"}
        </Button>
      </StickyFooter>
    </Page>
  );
}
