// Registrasi tenant (Figma "Validasi Akun Tenant"): Step 1 Tenant Registration (data diri + email/password + terms),
// Step 2 Occupancy Registration (apartment/floor/unit/ownership), lalu ke layar Tenant Account Validation.
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/api";
import type { Gender, OwnershipStatus, RegisterInput } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Cityscape } from "@/components/illustrations";
import { errorMessage, isApiError } from "@/lib/http";
import { loadSession, removeSession, saveSession } from "@/lib/storage";

const step1Schema = z.object({
  first_name: z.string().trim().min(2, "Nama depan minimal 2 huruf."),
  last_name: z.string().trim().min(1, "Nama belakang wajib diisi."),
  gender: z.enum(["male", "female"]),
  phone: z
    .string()
    .trim()
    .regex(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, "Nomor telepon tidak valid (contoh 08123456789)."),
  email: z.string().trim().email("Email tidak valid."),
  password: z.string().min(8, "Password minimal 8 karakter.").regex(/[A-Za-z]/, "Password harus mengandung huruf.").regex(/[0-9]/, "Password harus mengandung angka."),
  agree: z.literal(true, { errorMap: () => ({ message: "Anda harus menyetujui Syarat & Ketentuan." }) }),
});

type Step1 = z.infer<typeof step1Schema>;
type Errors = Partial<Record<string, string>>;

const DRAFT_KEY = "register-draft";

export default function RegisterPage() {
  const nav = useNavigate();
  const draft = loadSession<Partial<Step1> & { property_id?: string; floor_id?: string; unit_id?: string; ownership_status?: OwnershipStatus }>(DRAFT_KEY, {});
  const [step, setStep] = useState<1 | 2>(1);
  const [f, setF] = useState<Step1>({
    first_name: draft.first_name ?? "",
    last_name: draft.last_name ?? "",
    gender: (draft.gender as Gender) ?? "male",
    phone: draft.phone ?? "",
    email: draft.email ?? "",
    password: "",
    agree: (draft.agree as true) ?? (false as unknown as true),
  });
  const [occ, setOcc] = useState({ property_id: draft.property_id ?? "", floor_id: draft.floor_id ?? "", unit_id: draft.unit_id ?? "", ownership_status: (draft.ownership_status ?? "owner") as OwnershipStatus });
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const { password: _p, ...rest } = f;
    saveSession(DRAFT_KEY, { ...rest, ...occ });
  }, [f, occ]);

  const properties = useQuery({ queryKey: ["reg", "properties"], queryFn: () => api().properties() });
  const floors = useQuery({ queryKey: ["reg", "floors", occ.property_id], queryFn: () => api().floors(occ.property_id), enabled: !!occ.property_id });
  const units = useQuery({ queryKey: ["reg", "units", occ.floor_id], queryFn: () => api().units(occ.property_id, occ.floor_id), enabled: !!occ.property_id && !!occ.floor_id });

  const set = <K extends keyof Step1>(k: K, v: Step1[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function next1(e: FormEvent) {
    e.preventDefault();
    const r = step1Schema.safeParse(f);
    if (!r.success) {
      const errs: Errors = {};
      for (const issue of r.error.issues) errs[String(issue.path[0])] = issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep(2);
    window.scrollTo(0, 0);
  }

  const occValid = useMemo(() => !!occ.property_id && !!occ.floor_id && !!occ.unit_id && !!occ.ownership_status, [occ]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!occValid) return;
    setLoading(true);
    setServerError(null);
    try {
      const input: RegisterInput = { ...f, first_name: f.first_name.trim(), last_name: f.last_name.trim(), email: f.email.trim(), phone: f.phone.trim(), property_id: occ.property_id, unit_id: occ.unit_id, ownership_status: occ.ownership_status };
      const res = await api().register(input);
      removeSession(DRAFT_KEY);
      nav("/register/validation", { state: { userId: res.user_id, email: f.email.trim(), message: res.message }, replace: true });
    } catch (err) {
      if (isApiError(err) && err.problem.errors?.some((x) => ["email", "phone", "first_name", "last_name", "password"].includes(x.field))) {
        const errs: Errors = {};
        for (const x of err.problem.errors ?? []) errs[x.field] = x.message;
        setErrors(errs);
        setStep(1);
      } else setServerError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell relative flex min-h-dvh flex-col overflow-hidden bg-card">
      <div className="relative z-10 flex flex-1 flex-col px-4 pb-[calc(var(--safe-bottom)+16px)] pt-[calc(var(--safe-top)+8px)]">
        <button type="button" onClick={() => (step === 2 ? setStep(1) : nav(-1))} aria-label="Kembali" className="tap -ml-1 flex h-10 w-10 items-center justify-center text-brand-500">
          <ChevronLeft size={28} strokeWidth={2.5} />
        </button>
        <h1 className="mt-2 text-[24px] font-bold">{step === 1 ? "Tenant Registration" : "Occupancy Registration"}</h1>
        <p className="mt-1 text-[17px] text-foreground">Mulai perjalanan Anda bersama kami</p>
        <div className="mt-2 flex gap-1.5">
          <span className="h-1 flex-1 rounded-full bg-brand-500" />
          <span className={"h-1 flex-1 rounded-full " + (step === 2 ? "bg-brand-500" : "bg-neutral-200")} />
        </div>

        {step === 1 ? (
          <form onSubmit={next1} className="mt-6 flex flex-1 flex-col gap-5 fade-up" noValidate>
            <Input label="First Name" autoComplete="given-name" value={f.first_name} onChange={(e) => set("first_name", e.target.value)} error={errors.first_name} />
            <Input label="Last Name" autoComplete="family-name" value={f.last_name} onChange={(e) => set("last_name", e.target.value)} error={errors.last_name} />
            <Select
              label="Gender"
              value={f.gender}
              onChange={(e) => set("gender", e.target.value as Gender)}
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
            />
            <Input label="Phone Number" type="tel" inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" value={f.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} />
            <Input label="Email" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
            <Input label="Password" type="password" autoComplete="new-password" value={f.password} onChange={(e) => set("password", e.target.value)} error={errors.password} hint="Minimal 8 karakter, kombinasi huruf dan angka." />
            <label className="flex items-start gap-2 text-[15px]">
              <input type="checkbox" checked={!!f.agree} onChange={(e) => set("agree", e.target.checked as true)} className="mt-1 h-4 w-4 accent-brand-600" />
              <span>
                Dengan mendaftar, Anda menyetujui <span className="font-semibold text-accent-amber">Syarat & Ketentuan</span> kami
              </span>
            </label>
            {errors.agree && <div className="-mt-3 text-xs text-critical">{errors.agree}</div>}
            <div className="flex-1" />
            <Button block size="lg" type="submit">
              Next
            </Button>
          </form>
        ) : (
          <form onSubmit={submit} className="mt-6 flex flex-1 flex-col gap-5 fade-up" noValidate>
            <Select
              label="Apartement"
              placeholder="Pilih apartemen / gedung"
              value={occ.property_id}
              onChange={(e) => setOcc({ property_id: e.target.value, floor_id: "", unit_id: "", ownership_status: occ.ownership_status })}
              options={(properties.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
              hint={properties.isLoading ? "Memuat..." : undefined}
              error={properties.error ? errorMessage(properties.error) : undefined}
            />
            <Select
              label="Floor"
              placeholder="Pilih lantai"
              value={occ.floor_id}
              disabled={!occ.property_id}
              onChange={(e) => setOcc((s) => ({ ...s, floor_id: e.target.value, unit_id: "" }))}
              options={(floors.data ?? []).map((f) => ({ value: f.id, label: f.name }))}
            />
            <Select
              label="Unit"
              placeholder="Pilih unit"
              value={occ.unit_id}
              disabled={!occ.floor_id}
              onChange={(e) => setOcc((s) => ({ ...s, unit_id: e.target.value }))}
              options={(units.data ?? []).map((u) => ({ value: u.id, label: u.code || u.name }))}
            />
            <Select
              label="Ownership Status"
              value={occ.ownership_status}
              onChange={(e) => setOcc((s) => ({ ...s, ownership_status: e.target.value as OwnershipStatus }))}
              options={[
                { value: "owner", label: "Owner" },
                { value: "tenant", label: "Tenant / Penyewa" },
                { value: "family", label: "Keluarga Pemilik" },
              ]}
            />
            {serverError && (
              <div role="alert" className="rounded-lg bg-critical-soft px-3 py-2 text-sm text-critical-text">
                {serverError}
              </div>
            )}
            <div className="flex-1" />
            <Button block size="lg" type="submit" disabled={!occValid} loading={loading}>
              Next
            </Button>
          </form>
        )}
      </div>
      <Cityscape className="absolute bottom-0 left-0 h-[220px] opacity-70" />
    </div>
  );
}
