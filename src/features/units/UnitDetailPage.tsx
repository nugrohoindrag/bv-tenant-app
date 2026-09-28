// Detail satu unit (dari daftar My Unit bila tenant punya beberapa unit).
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { useAuth } from "@/app/auth";
import { Page, TopBar } from "@/components/ui/shell";
import { ErrorState, Skeleton } from "@/components/ui/misc";
import { errorMessage } from "@/lib/http";
import { term } from "@/lib/terms";
import { UnitDetail } from "./UnitDetail";

export default function UnitDetailPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ["my-units", id], queryFn: () => api().myUnit(id) });
  return (
    <Page className="bg-neutral-100 pb-8">
      <TopBar title={q.data?.unit.name ?? term(user, "my_unit")} />
      {q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : q.data ? (
        <UnitDetail s={q.data} />
      ) : (
        <div className="space-y-3 p-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      )}
    </Page>
  );
}
