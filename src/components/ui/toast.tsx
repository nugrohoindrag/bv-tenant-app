import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: Kind;
  message: string;
}
interface ToastApi {
  toast(message: string, kind?: Kind): void;
  success(message: string): void;
  error(message: string): void;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  const toast = useCallback((message: string, kind: Kind = "info") => {
    const id = ++seq.current;
    setItems((s) => [...s, { id, kind, message }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3200);
  }, []);
  const value = useMemo<ToastApi>(() => ({ toast, success: (m) => toast(m, "success"), error: (m) => toast(m, "error") }), [toast]);
  const icons: Record<Kind, ReactNode> = { success: <CheckCircle2 size={18} />, error: <AlertCircle size={18} />, info: <Info size={18} /> };
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+12px)] z-[70] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "fade-up pointer-events-auto flex max-w-[440px] items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-float",
              t.kind === "success" && "bg-success",
              t.kind === "error" && "bg-critical",
              t.kind === "info" && "bg-neutral-800",
            )}
          >
            {icons[t.kind]}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast di luar ToastProvider");
  return v;
}
