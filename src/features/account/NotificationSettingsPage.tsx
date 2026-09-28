// Preferensi notifikasi (P3-ACC-09, P3-NFR-03): push di perangkat ini + per jenis notifikasi (kanal Aplikasi & Push), dikelompokkan
// per `category` dari server. Email ditunda (D-P3-08) sehingga tidak ditampilkan sebagai pilihan.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff } from "lucide-react";
import { api } from "@/api";
import type { NotificationPreference, NotificationPreferenceUpdate } from "@/api/types";
import { Page, TopBar } from "@/components/ui/shell";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/misc";
import { Switch } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";
import { PushSettingsCard } from "@/components/push-card";
import { errorMessage } from "@/lib/http";
import { groupPreferences, notifTypeLabel } from "@/lib/labels";

const KEY = ["notification-preferences"];

export default function NotificationSettingsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: KEY, queryFn: () => api().notificationPreferences() });
  const m = useMutation({
    // server menggabungkan kanal: kirim hanya kanal yang diubah
    mutationFn: (p: NotificationPreferenceUpdate) => api().setNotificationPreference(p),
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<NotificationPreference[]>(KEY);
      qc.setQueryData<NotificationPreference[]>(KEY, (rows) => rows?.map((r) => (r.type === p.type ? { ...r, ...p } : r)));
      return { prev };
    },
    onError: (e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
      toast.error(errorMessage(e));
    },
  });
  const set = (p: NotificationPreference, patch: Partial<Pick<NotificationPreference, "inapp" | "push">>) => m.mutate({ type: p.type, ...patch });
  const groups = groupPreferences(q.data ?? []);

  return (
    <Page className="bg-neutral-100 pb-10">
      <TopBar title="Notifikasi" />
      <div className="space-y-4 p-4">
        <PushSettingsCard />
        {q.isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
        ) : q.error ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : groups.length === 0 ? (
          <EmptyState icon={<BellOff size={44} />} title="Belum ada jenis notifikasi" description="Pengaturan notifikasi akan tampil setelah pengelola mengaktifkan aturannya." />
        ) : (
          groups.map((g) => (
            <section key={g.category} className="overflow-hidden rounded-2xl bg-card shadow-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <h2 className="text-[14px] font-bold">{g.label}</h2>
                <div className="flex gap-5 pr-1 text-[10px] font-semibold uppercase text-neutral-400">
                  <span className="w-11 text-center">Aplikasi</span>
                  <span className="w-11 text-center">Push</span>
                </div>
              </div>
              {g.items.map((p) => (
                <div key={p.type} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                  <span className="min-w-0 flex-1 text-[13px] font-semibold text-neutral-800">{notifTypeLabel(p.type)}</span>
                  <Switch checked={p.inapp} onChange={(v) => set(p, { inapp: v })} label={`${notifTypeLabel(p.type)} di aplikasi`} />
                  <Switch checked={p.push} onChange={(v) => set(p, { push: v })} label={`${notifTypeLabel(p.type)} lewat push`} />
                </div>
              ))}
            </section>
          ))
        )}
        <p className="px-1 text-[11px] text-neutral-500">Notifikasi dikirim lewat aplikasi (Inbox) dan push. Email sedang tidak digunakan; hal penting juga dapat disampaikan pengelola lewat WhatsApp.</p>
      </div>
    </Page>
  );
}
