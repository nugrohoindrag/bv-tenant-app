// Ubah profil (P3-ACC-04): nama & nomor telepon lewat PATCH /tenant/me (phone "" mengosongkan nomor). Email hanya dapat diubah
// pengelola.
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/api";
import { useAuth } from "@/app/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Page, StickyFooter, TopBar } from "@/components/ui/shell";
import { useToast } from "@/components/ui/toast";
import { errorMessage, isApiError } from "@/lib/http";

export function validateProfile(name: string, phone: string): Record<string, string> {
  const err: Record<string, string> = {};
  if (name.trim().length < 2) err.full_name = "Nama minimal 2 karakter";
  const digits = phone.replace(/\D/g, "");
  if (phone.trim() && (digits.length < 8 || digits.length > 15)) err.phone = "Nomor telepon 8–15 digit";
  return err;
}

export default function EditProfilePage() {
  const { user, applyUser } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [name, setName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({
    // nomor dikosongkan → kirim "" (server menyimpan null); tidak berubah → tidak dikirim
    mutationFn: () => api().updateMe({ full_name: name.trim(), ...(phone.trim() !== (user?.phone ?? "") ? { phone: phone.trim() } : {}) }),
    onSuccess: (me) => {
      applyUser(me);
      toast.success("Profil diperbarui.");
      nav(-1);
    },
    onError: (e) => {
      if (isApiError(e) && e.problem.errors?.length) setErrors(Object.fromEntries(e.problem.errors.map((x) => [x.field, x.message])));
      toast.error(errorMessage(e));
    },
  });
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const err = validateProfile(name, phone);
    setErrors(err);
    if (!Object.keys(err).length) m.mutate();
  };
  if (!user) return null;
  return (
    <Page className="bg-card pb-28">
      <TopBar title="Ubah Profil" />
      <form onSubmit={submit} className="flex flex-col gap-5 px-4 pt-6">
        <Input variant="box" label="Nama lengkap" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.full_name} />
        <Input variant="box" label="Nomor telepon / WhatsApp" type="tel" inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} hint="Dipakai pengelola untuk menghubungi Anda, termasuk lewat WhatsApp. Kosongkan untuk menghapus nomor." />
        <Input variant="box" label="Email" value={user.email ?? "—"} disabled hint="Email login hanya dapat diubah oleh pengelola gedung." />
      </form>
      <StickyFooter>
        <Button block size="lg" loading={m.isPending} onClick={() => submit()}>
          Simpan
        </Button>
      </StickyFooter>
    </Page>
  );
}
