// Ajukan izin/stiker parkir (P3-PRK-02): kendaraan, jenis izin, area parkir (tenant/mixed), mulai berlaku, catatan →
// Security/Building Management menyetujui (area, masa berlaku, nomor stiker, tarif) atau menolak.
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Car } from "lucide-react";
import { api } from "@/api";
import type { PermitType } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { ChipGroup, Section } from "@/components/ui/controls";
import { Page, StickyFooter, TopBar } from "@/components/ui/shell";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/http";
import { PERMIT_TYPE } from "@/lib/labels";
import { canRequestPermit } from "./ParkingPage";

const TYPES: { value: PermitType; label: string }[] = (["monthly", "annual", "temporary"] as PermitType[]).map((v) => ({ value: v, label: PERMIT_TYPE[v] }));

export function todayYmd(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function PermitRequestPage() {
  const [sp] = useSearchParams();
  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: () => api().vehicles() });
  const areas = useQuery({ queryKey: ["parking-areas"], queryFn: () => api().parkingAreas(), staleTime: 5 * 60_000 });
  const nav = useNavigate();
  const eligible = (vehicles.data ?? []).filter(canRequestPermit);
  return (
    <Page className="bg-neutral-100 pb-28">
      <TopBar title="Ajukan Izin Parkir" />
      {vehicles.isLoading ? (
        <div className="p-4">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : vehicles.error ? (
        <ErrorState message={errorMessage(vehicles.error)} onRetry={() => vehicles.refetch()} />
      ) : eligible.length === 0 ? (
        <EmptyState icon={<Car size={48} />} title="Tidak ada kendaraan yang dapat diajukan" description="Semua kendaraan sudah memiliki izin aktif atau permohonan yang sedang diproses." action={<Button onClick={() => nav("/parking/vehicles/new")}>Daftarkan kendaraan</Button>} />
      ) : (
        <PermitForm vehicles={eligible} initialVehicle={sp.get("vehicle")} areas={areas.data ?? []} />
      )}
    </Page>
  );
}

function PermitForm({ vehicles, initialVehicle, areas }: { vehicles: { id: string; plate_number: string; unit_name: string | null }[]; initialVehicle: string | null; areas: { id: string; name: string; code: string }[] }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState(() => ({ vehicle_id: vehicles.some((v) => v.id === initialVehicle) ? initialVehicle! : vehicles[0]!.id, permit_type: "monthly" as PermitType, parking_area_id: "", valid_from: todayYmd(), notes: "" }));
  const m = useMutation({
    mutationFn: () => api().requestPermit({ vehicle_id: f.vehicle_id, permit_type: f.permit_type, parking_area_id: f.parking_area_id || null, valid_from: f.valid_from || null, notes: f.notes }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["parking-permits"] });
      toast.success("Permohonan izin parkir dikirim.");
      nav(`/parking/permits/${p.id}`, { replace: true });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <>
      <div className="space-y-3 p-4">
        <Section>
          <div className="space-y-4">
            <Select variant="box" label="Kendaraan" value={f.vehicle_id} onChange={(e) => setF({ ...f, vehicle_id: e.target.value })} options={vehicles.map((v) => ({ value: v.id, label: v.plate_number + (v.unit_name ? ` · ${v.unit_name}` : "") }))} />
            <ChipGroup label="Jenis izin" value={f.permit_type} onChange={(t) => setF({ ...f, permit_type: t })} options={TYPES} />
            <Select variant="box" label="Area parkir" value={f.parking_area_id} onChange={(e) => setF({ ...f, parking_area_id: e.target.value })} options={[{ value: "", label: "Ditentukan pengelola" }, ...areas.map((a) => ({ value: a.id, label: `${a.name} (${a.code})` }))]} />
            <Input variant="box" label="Mulai berlaku" type="date" value={f.valid_from} min={todayYmd()} onChange={(e) => setF({ ...f, valid_from: e.target.value })} />
            <Textarea label="Catatan (opsional)" rows={3} className="[&_textarea]:min-h-[88px]" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="mis. kendaraan dipakai harian, butuh slot dekat lift" />
          </div>
        </Section>
        <p className="px-1 text-[12px] text-neutral-500">Pengelola menentukan masa berlaku, nomor stiker, dan tarif (bila ada). Anda akan mendapat notifikasi saat permohonan diputuskan.</p>
      </div>
      <StickyFooter>
        <Button block size="lg" loading={m.isPending} onClick={() => m.mutate()}>
          Kirim permohonan
        </Button>
      </StickyFooter>
    </>
  );
}
