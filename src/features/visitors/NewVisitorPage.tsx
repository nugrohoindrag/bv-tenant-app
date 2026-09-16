// Daftarkan tamu (PRD §3.7 pre-registration): nama, telepon, waktu kedatangan, keperluan, jumlah, plat kendaraan.
// Nomor identitas hanya disimpan 4 digit terakhir (server). Pass QR diterbitkan server (atau setelah persetujuan).
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import { useAuth } from "@/app/auth";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Page, StickyFooter, TopBar } from "@/components/ui/shell";
import { useToast } from "@/components/ui/toast";
import { errorMessage, isApiError } from "@/lib/http";

const local = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function NewVisitorPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const soon = new Date(Date.now() + 3_600_000);
  soon.setMinutes(0, 0, 0);
  const [f, setF] = useState({ visitor_name: "", visitor_phone: "", visitor_company: "", purpose: "", vehicle_plate: "", headcount: "1", expected_at: local(soon), expected_until: "", id_number: "", unit_id: user?.primary_unit?.id ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () => api().createVisitor({ visitor_name: f.visitor_name.trim(), visitor_phone: f.visitor_phone || null, visitor_company: f.visitor_company || null, purpose: f.purpose || null, vehicle_plate: f.vehicle_plate || null, headcount: Number(f.headcount) || 1, expected_at: new Date(f.expected_at).toISOString(), expected_until: f.expected_until ? new Date(f.expected_until).toISOString() : null, host_unit_location_id: f.unit_id || null }),
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["visitors"] });
      toast.success(v.pass ? "Tamu terdaftar. Bagikan pass QR ke tamu Anda." : "Pendaftaran tamu dikirim, menunggu persetujuan.");
      nav(`/visitors/${v.id}`, { replace: true });
    },
    onError: (e) => {
      if (isApiError(e) && e.problem.errors?.length) setErrors(Object.fromEntries(e.problem.errors.map((x) => [x.field, x.message])));
      toast.error(errorMessage(e));
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (f.visitor_name.trim().length < 2) err.visitor_name = "Nama tamu wajib";
    if (!f.expected_at || new Date(f.expected_at).getTime() < Date.now() - 15 * 60_000) err.expected_at = "Waktu kedatangan harus di masa mendatang";
    setErrors(err);
    if (Object.keys(err).length) return;
    m.mutate();
  };
  const units = user?.units ?? [];
  return (
    <Page className="pb-28">
      <TopBar title="Daftarkan Tamu" />
      <form onSubmit={submit} className="space-y-4 px-4 pt-4">
        <Input variant="box" label="Nama tamu" required value={f.visitor_name} onChange={(e) => setF({ ...f, visitor_name: e.target.value })} error={errors.visitor_name} />
        <div className="grid grid-cols-2 gap-3">
          <Input variant="box" label="Telepon tamu" type="tel" value={f.visitor_phone} onChange={(e) => setF({ ...f, visitor_phone: e.target.value })} />
          <Input variant="box" label="Jumlah orang" type="number" min={1} max={20} value={f.headcount} onChange={(e) => setF({ ...f, headcount: e.target.value })} />
        </div>
        <Input variant="box" label="Waktu kedatangan" type="datetime-local" value={f.expected_at} onChange={(e) => setF({ ...f, expected_at: e.target.value })} error={errors.expected_at} />
        <Input variant="box" label="Sampai (opsional)" type="datetime-local" value={f.expected_until} onChange={(e) => setF({ ...f, expected_until: e.target.value })} />
        {units.length > 1 && <Select variant="box" label="Unit yang dikunjungi" value={f.unit_id} onChange={(e) => setF({ ...f, unit_id: e.target.value })} options={units.map((u) => ({ value: u.id, label: u.name }))} />}
        <Input variant="box" label="Keperluan" placeholder="mis. kunjungan keluarga, kurir, teknisi" value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input variant="box" label="Perusahaan (opsional)" value={f.visitor_company} onChange={(e) => setF({ ...f, visitor_company: e.target.value })} />
          <Input variant="box" label="Plat kendaraan" placeholder="B 1234 XY" value={f.vehicle_plate} onChange={(e) => setF({ ...f, vehicle_plate: e.target.value.toUpperCase() })} />
        </div>
        <p className="text-[12px] text-neutral-500">{user?.features.visitor_approval_required ? "Property ini mewajibkan persetujuan building management sebelum pass diterbitkan." : "Pass QR diterbitkan langsung dan berlaku sekitar waktu kedatangan. Security memverifikasi saat tamu tiba."}</p>
      </form>
      <StickyFooter>
        <Button block size="lg" loading={m.isPending} onClick={submit}>Daftarkan Tamu</Button>
      </StickyFooter>
    </Page>
  );
}
