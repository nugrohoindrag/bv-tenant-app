// Langkah 2 — Select Category (PRD §11; kategori per property/profile dari /tenant/categories).
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { api } from "@/api";
import { CategoryIcon } from "@/components/category-icon";
import { ErrorState, Skeleton } from "@/components/ui/misc";
import { errorMessage } from "@/lib/http";
import { cn } from "@/lib/utils";
import { useReportDraft } from "./ReportLayout";

export default function CategoryStep() {
  const { draft, update } = useReportDraft();
  const nav = useNavigate();
  const cats = useQuery({ queryKey: ["sr-categories"], queryFn: () => api().categories(), staleTime: 5 * 60_000 });

  if (cats.isLoading)
    return (
      <div className="px-4 pt-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="mb-3 h-[72px]" />
        ))}
      </div>
    );
  if (cats.error) return <ErrorState message={errorMessage(cats.error)} onRetry={() => cats.refetch()} />;

  return (
    <ul className="pb-6">
      {(cats.data ?? []).map((c) => {
        const active = draft.category?.code === c.code;
        return (
          <li key={c.code} className="border-b border-neutral-200 px-4">
            <button
              type="button"
              onClick={() => {
                update({ category: c });
                nav("/report/describe");
              }}
              className={cn("tap flex w-full items-center gap-5 py-4 text-left", active && "bg-brand-50/60")}
            >
              <CategoryIcon icon={c.icon || c.code} size={56} className="shrink-0" />
              <span className="flex-1 text-[17px] font-semibold text-neutral-700">{c.name}</span>
              {active && <Check className="text-brand-600" size={28} />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
