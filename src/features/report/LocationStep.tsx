// Langkah 1 — Select Location (PRD §10 9.2): [ My Unit — A-1208 ] [ Common Area ] [ Other Authorized Area ]; unit otomatis terisi.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, Check, ChevronRight, Home, MapPin } from "lucide-react";
import { api } from "@/api";
import { useAuth } from "@/app/auth";
import type { ReportableLocation } from "@/api/types";
import { ErrorState, Skeleton } from "@/components/ui/misc";
import { errorMessage } from "@/lib/http";
import { term } from "@/lib/terms";
import { cn } from "@/lib/utils";
import { useReportDraft } from "./ReportLayout";

export default function LocationStep() {
  const { draft, update } = useReportDraft();
  const { user } = useAuth();
  const nav = useNavigate();
  const q = useQuery({ queryKey: ["tenant-locations"], queryFn: () => api().locations(), staleTime: 5 * 60_000 });
  const [group, setGroup] = useState<"common_area" | "other" | null>(null);

  if (q.isLoading)
    return (
      <div className="space-y-3 px-4 pt-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[72px]" />
        ))}
      </div>
    );
  if (q.error) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;

  const rows = q.data ?? [];
  const units = rows.filter((r) => r.scope === "unit");
  const common = rows.filter((r) => r.scope === "common_area");
  const other = rows.filter((r) => r.scope === "other");
  const pick = (l: ReportableLocation) => {
    update({ location: { id: l.id, label: l.path_text || l.name, scope: l.scope } });
    nav("/report/category");
  };
  const selected = draft.location?.id;

  return (
    <div className="flex-1 px-4 pb-6 pt-4">
      <p className="mb-3 text-[13px] text-neutral-600">Unit Anda terisi otomatis. Pilih area umum bila masalah berada di luar unit.</p>
      <ul className="space-y-3">
        {units.map((u) => (
          <li key={u.id}>
            <Choice icon={<Home size={22} />} title={`${term(user, "my_unit")} — ${u.name.replace(/^Unit\s+/i, "")}`} subtitle={u.path_text} active={selected === u.id} onClick={() => pick(u)} />
          </li>
        ))}
        {common.length > 0 && (
          <li>
            <Choice icon={<Building2 size={22} />} title="Common Area" subtitle={`${common.length} area umum yang dapat dilaporkan`} active={group === "common_area"} chevron onClick={() => setGroup(group === "common_area" ? null : "common_area")} />
            {group === "common_area" && <SubList rows={common} selected={selected} onPick={pick} />}
          </li>
        )}
        {other.length > 0 && (
          <li>
            <Choice icon={<MapPin size={22} />} title="Other Authorized Area" subtitle={`${other.length} area akses khusus`} active={group === "other"} chevron onClick={() => setGroup(group === "other" ? null : "other")} />
            {group === "other" && <SubList rows={other} selected={selected} onPick={pick} />}
          </li>
        )}
      </ul>
      {rows.length === 0 && <p className="mt-6 text-center text-[13px] text-neutral-500">Belum ada unit/area yang terhubung ke akun Anda. Hubungi building management.</p>}
    </div>
  );
}

function Choice({ icon, title, subtitle, active, chevron, onClick }: { icon: React.ReactNode; title: string; subtitle?: string; active?: boolean; chevron?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("tap flex w-full items-center gap-3 rounded-2xl border-2 bg-card p-4 text-left shadow-card", active ? "border-brand-500" : "border-transparent")}>
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", active ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-600")}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold text-neutral-800">{title}</span>
        {subtitle && <span className="block truncate text-[12px] text-neutral-500">{subtitle}</span>}
      </span>
      {chevron ? <ChevronRight size={20} className="text-neutral-400" /> : active ? <Check size={22} className="text-brand-600" /> : null}
    </button>
  );
}

function SubList({ rows, selected, onPick }: { rows: ReportableLocation[]; selected?: string | null; onPick: (l: ReportableLocation) => void }) {
  return (
    <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-card">
      {rows.map((r) => (
        <li key={r.id}>
          <button type="button" onClick={() => onPick(r)} className={cn("tap flex w-full items-center gap-3 px-4 py-3 text-left", selected === r.id && "bg-brand-50/60")}>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-neutral-800">{r.name}</span>
              <span className="block truncate text-[11px] text-neutral-500">{r.path_text}</span>
            </span>
            {selected === r.id && <Check size={18} className="text-brand-600" />}
          </button>
        </li>
      ))}
    </ul>
  );
}
