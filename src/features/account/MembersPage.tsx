// Anggota tenant (P3-ACC-08, Tenant Admin): daftar anggota, tambah anggota (password sementara ditampilkan SEKALI — anggota
// wajib menggantinya saat login pertama), nonaktifkan / aktifkan kembali, atur akses unit (subset unit milik admin).
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, UserPlus, Users } from "lucide-react";
import { api } from "@/api";
import { useAuth } from "@/app/auth";
import type { AccessLoc, Member, MemberCreated } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Page, TopBar } from "@/components/ui/shell";
import { Dialog, EmptyState, ErrorState, Sheet, Skeleton, StatusBadge } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { WhatsAppButton } from "@/components/contact";
import { errorMessage, isApiError } from "@/lib/http";
import { fmtRelative } from "@/lib/format";
import { term } from "@/lib/terms";
import { useActiveUnit } from "@/lib/active-unit";
import { cn } from "@/lib/utils";

const KEY = ["tenant-members"];

export default function MembersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const admin = !!user?.is_tenant_admin;
  const q = useQuery({ queryKey: KEY, queryFn: () => api().members(), enabled: admin });
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState<MemberCreated | null>(null);
  const [unitsFor, setUnitsFor] = useState<Member | null>(null);
  const [confirmOff, setConfirmOff] = useState<Member | null>(null);
  const done = (msg: string) => {
    qc.invalidateQueries({ queryKey: KEY });
    toast.success(msg);
  };
  const deactivate = useMutation({
    mutationFn: (m: Member) => api().deactivateMember(m.tenant_user_id),
    onSuccess: () => {
      setConfirmOff(null);
      done("Anggota dinonaktifkan.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const reactivate = useMutation({ mutationFn: (m: Member) => api().reactivateMember(m.tenant_user_id), onSuccess: () => done("Anggota diaktifkan kembali."), onError: (e) => toast.error(errorMessage(e)) });

  if (!user) return null;
  const customer = term(user, "customer");
  return (
    <Page className="bg-neutral-100 pb-10">
      <TopBar title={`Anggota ${customer}`} right={admin ? <button type="button" aria-label="Tambah anggota" onClick={() => setAdding(true)} className="tap p-2 text-brand-600"><UserPlus size={20} /></button> : undefined} />
      <div className="space-y-3 p-4">
        {!admin ? (
          <EmptyState icon={<Users size={44} />} title="Khusus Tenant Admin" description="Pengelolaan anggota hanya tersedia untuk admin tenant. Hubungi admin tenant Anda atau pengelola gedung." />
        ) : q.isLoading ? (
          [0, 1].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : q.error ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : (
          <>
            <p className="px-1 text-[12px] text-neutral-600">
              Anggota {user.tenant?.name ?? customer} dapat membuat permintaan, melihat tagihan, dan layanan lain untuk unit yang Anda berikan.
            </p>
            {(q.data ?? []).map((m) => (
              <MemberCard key={m.tenant_user_id} m={m} onUnits={() => setUnitsFor(m)} onDeactivate={() => setConfirmOff(m)} onReactivate={() => reactivate.mutate(m)} busy={reactivate.isPending && reactivate.variables?.tenant_user_id === m.tenant_user_id} />
            ))}
            {(q.data ?? []).length <= 1 ? (
              <EmptyState icon={<UserPlus size={40} />} title="Belum ada anggota lain" description="Tambahkan rekan atau anggota keluarga agar mereka dapat memakai aplikasi." action={<Button onClick={() => setAdding(true)}>Tambah anggota</Button>} />
            ) : (
              <Button block variant="outline" onClick={() => setAdding(true)}>
                <UserPlus size={18} /> Tambah anggota
              </Button>
            )}
          </>
        )}
      </div>

      {admin && <AddMemberSheet open={adding} onClose={() => setAdding(false)} units={user.units} onCreated={(c) => { setAdding(false); setCreated(c); qc.invalidateQueries({ queryKey: KEY }); }} />}
      {unitsFor && <UnitsSheet member={unitsFor} units={user.units} onClose={() => setUnitsFor(null)} onSaved={() => { setUnitsFor(null); done("Akses unit diperbarui."); }} />}

      <Dialog open={!!confirmOff} onClose={() => setConfirmOff(null)} title="Nonaktifkan anggota?">
        <p className="text-[14px] text-neutral-700">{confirmOff?.full_name} tidak dapat login sampai diaktifkan kembali. Sesi yang sedang berjalan diakhiri.</p>
        <div className="mt-4 flex gap-2">
          <Button block variant="outline" onClick={() => setConfirmOff(null)}>
            Batal
          </Button>
          <Button block variant="danger" loading={deactivate.isPending} onClick={() => confirmOff && deactivate.mutate(confirmOff)}>
            Nonaktifkan
          </Button>
        </div>
      </Dialog>

      <Dialog open={!!created} onClose={() => setCreated(null)} title="Anggota ditambahkan">
        {created && <TemporaryPassword created={created} propertyName={user.property.name} />}
      </Dialog>
    </Page>
  );
}

function MemberCard({ m, onUnits, onDeactivate, onReactivate, busy }: { m: Member; onUnits: () => void; onDeactivate: () => void; onReactivate: () => void; busy: boolean }) {
  return (
    <section className="rounded-2xl bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[15px] font-bold text-neutral-800">{m.full_name}</span>
            {m.is_self && <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">Anda</span>}
          </div>
          <div className="truncate text-[12px] text-neutral-500">{[m.email, m.phone].filter(Boolean).join(" · ") || "—"}</div>
          <div className="text-[11px] text-neutral-400">
            {m.role === "tenant_admin" ? "Admin tenant" : "Anggota"} · {m.last_seen_at ? `aktif ${fmtRelative(m.last_seen_at)}` : "belum pernah login"}
          </div>
        </div>
        <StatusBadge status={m.status} objectType="tenant_user" />
      </div>
      {m.units.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {m.units.map((u) => (
            <span key={u.id} className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", u.is_primary ? "bg-brand-50 text-brand-700" : "bg-neutral-100 text-neutral-600")}>
              {u.name}
            </span>
          ))}
        </div>
      )}
      {m.can_manage && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="soft" onClick={onUnits} disabled={m.status !== "active"}>
            Atur unit
          </Button>
          {m.status === "active" ? (
            <Button size="sm" variant="ghost" className="text-critical" onClick={onDeactivate}>
              Nonaktifkan
            </Button>
          ) : (
            <Button size="sm" variant="outline" loading={busy} onClick={onReactivate}>
              Aktifkan kembali
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function UnitChecklist({ units, value, onChange }: { units: AccessLoc[]; value: string[]; onChange: (ids: string[]) => void }) {
  return (
    <div className="space-y-2">
      {units.map((u) => {
        const on = value.includes(u.id);
        return (
          <label key={u.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3", on ? "border-brand-500 bg-brand-50/50" : "border-border")}>
            <input type="checkbox" className="h-4 w-4 accent-[var(--bv-brand-600)]" checked={on} onChange={() => onChange(on ? value.filter((x) => x !== u.id) : [...value, u.id])} />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold">{u.name}</span>
              <span className="block truncate text-[11px] text-neutral-500">{u.path_text}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

function AddMemberSheet({ open, onClose, units, onCreated }: { open: boolean; onClose: () => void; units: AccessLoc[]; onCreated: (c: MemberCreated) => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const active = useActiveUnit(user);
  const [f, setF] = useState({ full_name: "", email: "", phone: "" });
  const [unitIds, setUnitIds] = useState<string[]>(active ? [active.id] : []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () => api().createMember({ full_name: f.full_name.trim(), email: f.email.trim(), phone: f.phone.trim() || undefined, unit_ids: unitIds }),
    onSuccess: (c) => {
      setF({ full_name: "", email: "", phone: "" });
      setErrors({});
      onCreated(c);
    },
    onError: (e) => {
      if (isApiError(e) && e.problem.errors?.length) setErrors(Object.fromEntries(e.problem.errors.map((x) => [x.field, x.message])));
      toast.error(errorMessage(e));
    },
  });
  const submit = () => {
    const err: Record<string, string> = {};
    if (f.full_name.trim().length < 2) err.full_name = "Nama wajib diisi";
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) err.email = "Email tidak valid";
    if (!unitIds.length) err.unit_ids = "Pilih minimal satu unit";
    setErrors(err);
    if (!Object.keys(err).length) m.mutate();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Tambah anggota" className="max-h-[90dvh] overflow-y-auto">
      <div className="space-y-4">
        <Input variant="box" label="Nama lengkap" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} error={errors.full_name} />
        <Input variant="box" label="Email (untuk login)" type="email" inputMode="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={errors.email} />
        <Input variant="box" label="Nomor telepon / WhatsApp (opsional)" type="tel" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} error={errors.phone} />
        <div>
          <div className="mb-1.5 text-[13px] font-semibold text-neutral-text">Akses unit</div>
          <UnitChecklist units={units} value={unitIds} onChange={setUnitIds} />
          {errors.unit_ids && <div className="mt-1 text-xs text-critical">{errors.unit_ids}</div>}
        </div>
        <p className="text-[12px] text-neutral-500">Password sementara akan ditampilkan sekali setelah anggota dibuat. Anggota wajib menggantinya saat login pertama.</p>
        <Button block loading={m.isPending} onClick={submit}>
          Buat akun anggota
        </Button>
      </div>
    </Sheet>
  );
}

function UnitsSheet({ member, units, onClose, onSaved }: { member: Member; units: AccessLoc[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [ids, setIds] = useState<string[]>(member.units.filter((u) => units.some((x) => x.id === u.id)).map((u) => u.id));
  const m = useMutation({ mutationFn: () => api().setMemberUnits(member.tenant_user_id, ids), onSuccess: onSaved, onError: (e) => toast.error(errorMessage(e)) });
  return (
    <Sheet open onClose={onClose} title={`Unit ${member.full_name}`} className="max-h-[90dvh] overflow-y-auto">
      <p className="mb-3 text-[13px] text-neutral-600">Pilih unit yang dapat diakses anggota ini. Unit pertama yang dipilih menjadi unit utamanya.</p>
      <UnitChecklist units={units} value={ids} onChange={setIds} />
      <Button block className="mt-4" disabled={!ids.length} loading={m.isPending} onClick={() => m.mutate()}>
        Simpan akses unit
      </Button>
    </Sheet>
  );
}

function TemporaryPassword({ created, propertyName }: { created: MemberCreated; propertyName: string }) {
  const toast = useToast();
  const { member, temporary_password: pw } = created;
  const copy = () => navigator.clipboard.writeText(pw).then(() => toast.success("Password disalin."), () => toast.error("Gagal menyalin."));
  const text = `Halo ${member.full_name}, akun BuildingVision Tenant App Anda di ${propertyName} sudah dibuat.\nEmail: ${member.email ?? "-"}\nPassword sementara: ${pw}\nSilakan login dan ganti password Anda.`;
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-neutral-700">
        Akun <b>{member.full_name}</b> ({member.email}) aktif. Sampaikan password sementara ini ke anggota — <b>hanya ditampilkan sekali</b>.
      </p>
      <div className="flex items-center justify-between gap-2 rounded-xl bg-neutral-100 p-3">
        <span className="flex items-center gap-2 font-mono text-[18px] font-bold tracking-wider">
          <KeyRound size={16} className="text-brand-600" /> {pw}
        </span>
        <button type="button" aria-label="Salin password" onClick={copy} className="tap p-1 text-brand-600">
          <Copy size={18} />
        </button>
      </div>
      <WhatsAppButton number={member.phone} text={text} label="Kirim via WhatsApp" />
    </div>
  );
}
