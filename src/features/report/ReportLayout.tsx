// Wizard "Report an Issue" (PRD P1 v1.3 §10 Primary Journey): Select Location → Select Category → Describe Problem →
// Add Photo → Submit → Ticket Created. Draft disimpan di context (foto di memori; teks di sessionStorage).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Camera, MapPin, Pencil, Send, Tag } from "lucide-react";
import type { AreaScope, SRCategory } from "@/api/types";
import { TopBar } from "@/components/ui/shell";
import { loadSession, removeSession, saveSession } from "@/lib/storage";
import { cn, uuid } from "@/lib/utils";

export interface DraftPhoto {
  id: string;
  blob: Blob;
  url: string;
}

export interface ReportDraft {
  photos: DraftPhoto[];
  location: { id: string | null; label: string; scope: AreaScope } | null;
  category: SRCategory | null;
  title: string;
  description: string;
  contact_preference: string;
  preferred_visit_at: string;
  additional_note: string;
  idempotency_key: string;
}

interface DraftApi {
  draft: ReportDraft;
  update(patch: Partial<ReportDraft>): void;
  addPhotos(blobs: Blob[]): void;
  removePhoto(id: string): void;
  reset(): void;
}

const Ctx = createContext<DraftApi | null>(null);
const KEY = "report-draft";
export const MAX_PHOTOS = 5;

type Persisted = Omit<ReportDraft, "photos">;

function empty(): ReportDraft {
  const p = loadSession<Partial<Persisted>>(KEY, {});
  return { photos: [], location: p.location ?? null, category: p.category ?? null, title: p.title ?? "", description: p.description ?? "", contact_preference: p.contact_preference ?? "", preferred_visit_at: p.preferred_visit_at ?? "", additional_note: p.additional_note ?? "", idempotency_key: p.idempotency_key ?? uuid() };
}

export function useReportDraft(): DraftApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useReportDraft di luar ReportLayout");
  return v;
}

export const steps = [
  { path: "/report/location", icon: MapPin, title: "Di mana masalahnya?" },
  { path: "/report/category", icon: Tag, title: "Apa kategori masalahnya?" },
  { path: "/report/describe", icon: Pencil, title: "Ceritakan masalahnya" },
  { path: "/report/photo", icon: Camera, title: "Tambahkan foto" },
  { path: "/report/confirm", icon: Send, title: "Periksa & kirim" },
];

export default function ReportLayout() {
  const [draft, setDraft] = useState<ReportDraft>(empty);
  const submitted = useRef(false);
  const loc = useLocation();
  const nav = useNavigate();
  const stepIndex = Math.max(
    0,
    steps.findIndex((s) => loc.pathname.startsWith(s.path)),
  );

  useEffect(() => {
    const { photos: _p, ...rest } = draft;
    saveSession(KEY, rest);
  }, [draft]);

  // Guard urutan: langkah lanjut butuh langkah sebelumnya terisi.
  useEffect(() => {
    if (submitted.current) return;
    if (stepIndex >= 1 && !draft.location) nav("/report/location", { replace: true });
    else if (stepIndex >= 2 && !draft.category) nav("/report/category", { replace: true });
    else if (stepIndex >= 3 && draft.description.trim().length < 10) nav("/report/describe", { replace: true });
  }, [stepIndex, draft, nav]);

  const update = useCallback((patch: Partial<ReportDraft>) => setDraft((d) => ({ ...d, ...patch })), []);
  const addPhotos = useCallback((blobs: Blob[]) => {
    setDraft((d) => {
      const room = MAX_PHOTOS - d.photos.length;
      const add = blobs.slice(0, Math.max(0, room)).map((b) => ({ id: uuid(), blob: b, url: URL.createObjectURL(b) }));
      return { ...d, photos: [...d.photos, ...add] };
    });
  }, []);
  const removePhoto = useCallback((id: string) => {
    setDraft((d) => {
      const p = d.photos.find((x) => x.id === id);
      if (p) URL.revokeObjectURL(p.url);
      return { ...d, photos: d.photos.filter((x) => x.id !== id) };
    });
  }, []);
  const reset = useCallback(() => {
    submitted.current = true;
    setDraft((d) => {
      d.photos.forEach((p) => URL.revokeObjectURL(p.url));
      return { photos: [], location: null, category: null, title: "", description: "", contact_preference: "", preferred_visit_at: "", additional_note: "", idempotency_key: uuid() };
    });
    removeSession(KEY);
  }, []);

  const value = useMemo<DraftApi>(() => ({ draft, update, addPhotos, removePhoto, reset }), [draft, update, addPhotos, removePhoto, reset]);
  const onBack = () => (stepIndex === 0 ? nav("/") : nav(steps[stepIndex - 1]!.path));

  return (
    <Ctx.Provider value={value}>
      <div className="app-shell flex min-h-dvh flex-col bg-card">
        <TopBar title="Report an Issue" onBack={onBack} />
        <Stepper index={stepIndex} />
        <h1 className="border-b border-border px-6 pb-4 pt-3 text-center text-[20px] font-bold leading-snug text-neutral-800">{steps[stepIndex]!.title}</h1>
        <div className="flex flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </Ctx.Provider>
  );
}

function Stepper({ index }: { index: number }) {
  return (
    <div className="px-4 pt-5">
      <div className="relative grid grid-cols-5">
        <div className="absolute left-[10%] right-[10%] top-[17px] h-[3px] bg-neutral-200" />
        <div className="absolute left-[10%] top-[17px] h-[3px] bg-brand-500 transition-all" style={{ width: `calc(${index} * 20%)` }} />
        {steps.map((s, i) => {
          const active = i <= index;
          return (
            <div key={s.path} className="relative flex flex-col items-center gap-1.5">
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-full border-[3px] bg-card", active ? "border-brand-500 text-brand-600" : "border-neutral-300 text-neutral-400")}>
                <s.icon size={16} strokeWidth={2.2} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
