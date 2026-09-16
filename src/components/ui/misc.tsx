import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { statusDef, type ObjectType } from "@/lib/status-map";
import { Button } from "./button";

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} className={cn("rounded-2xl bg-card shadow-card", onClick && "tap w-full text-left", className)}>
      {children}
    </Tag>
  );
}

export function Avatar({ name, color, size = 32, src }: { name: string; color?: string; size?: number; src?: string | null }) {
  return src ? (
    <img src={src} alt={name} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white" style={{ width: size, height: size, background: color ?? "#14A69E", fontSize: size * 0.4 }}>
      {initials(name)}
    </span>
  );
}

/** Badge status dari contracts/status-map.yaml (generated). objectType default: status tenant-facing Service Request (PRD §14). */
export function StatusBadge({ status, objectType = "service_request_tenant", className }: { status: string; objectType?: ObjectType; className?: string }) {
  const def = statusDef(objectType, status);
  const label = def?.label_id ?? status;
  const sem = def?.semantic ?? "neutral";
  const solid = def?.variant === "solid";
  const cls: Record<string, string> = {
    success: solid ? "bg-success text-white" : "bg-success-soft text-success-text",
    warning: solid ? "bg-warning text-white" : "bg-warning-soft text-warning-text",
    critical: solid ? "bg-critical text-white" : "bg-critical-soft text-critical-text",
    info: solid ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700",
    neutral: def?.variant === "outline" ? "border border-neutral-300 text-neutral-text" : "bg-neutral-soft text-neutral-text",
  };
  return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold", cls[sem], className)}>{label}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 text-neutral-300">{icon}</div>}
      <div className="text-[16px] font-bold">{title}</div>
      {description && <p className="mt-1 max-w-[280px] text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      title="Gagal memuat"
      description={message}
      action={
        onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Coba lagi
          </Button>
        )
      }
    />
  );
}

/** Bottom sheet sederhana (Figma: lokasi area, komplain). */
export function Sheet({ open, onClose, title, children, className }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; className?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="Tutup" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={cn("sheet-up relative w-full max-w-[480px] rounded-t-[28px] bg-card px-5 pb-[calc(var(--safe-bottom)+20px)] pt-3 shadow-modal", className)}>
        <div className="mx-auto mb-4 h-1 w-14 rounded-full bg-neutral-300" />
        {title && <div className="mb-4 text-center text-[20px] font-bold">{title}</div>}
        {children}
      </div>
    </div>
  );
}

export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" role="dialog" aria-modal="true">
      <button type="button" aria-label="Tutup" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="fade-up relative w-full max-w-[420px] rounded-2xl bg-card p-5 shadow-modal">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[17px] font-bold">{title}</div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-full p-1 text-neutral-500">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PhotoStrip({ photos, size = 112, onRemove, className }: { photos: { id: string; url: string }[]; size?: number; onRemove?: (id: string) => void; className?: string }) {
  return (
    <div className={cn("no-scrollbar flex gap-3 overflow-x-auto", className)}>
      {photos.map((p) => (
        <div key={p.id} className="relative shrink-0 overflow-hidden rounded-lg bg-neutral-200" style={{ width: size, height: size * 0.8 }}>
          <img src={p.url} alt="" className="h-full w-full object-cover" />
          {onRemove && (
            <button type="button" onClick={() => onRemove(p.id)} aria-label="Hapus foto" className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-critical text-white shadow">
              <X size={14} strokeWidth={3} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
