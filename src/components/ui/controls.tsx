// Kontrol kecil: Switch (preferensi), ChipGroup (pilihan tunggal), DetailRow & Section (kartu detail), FilterTabs.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50", checked ? "bg-brand-600" : "bg-neutral-300")}
    >
      <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition", checked ? "translate-x-[22px]" : "translate-x-[2px]")} />
    </button>
  );
}

export function ChipGroup<T extends string>({ value, onChange, options, className, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string; label?: string }) {
  return (
    <div className={className}>
      {label && <div className="mb-1.5 text-[13px] font-semibold text-neutral-text">{label}</div>}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn("rounded-full px-3.5 py-1.5 text-[13px] font-semibold", value === o.value ? "bg-brand-600 text-white" : "bg-card text-neutral-text shadow-card ring-1 ring-border")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FilterTabs<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <div className={cn("no-scrollbar flex gap-2 overflow-x-auto", className)}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} className={cn("shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold", value === o.value ? "bg-brand-600 text-white" : "bg-card text-neutral-text shadow-card")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Section({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl bg-card p-4 shadow-card", className)}>
      {(title || action) && (
        <div className="mb-2 flex items-center justify-between gap-2">
          {title && <h2 className="text-[14px] font-bold text-neutral-800">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function DetailRow({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start gap-2 py-1.5 text-[13px]">
      {icon && <span className="mt-0.5 text-brand-600">{icon}</span>}
      <span className="w-[120px] shrink-0 text-neutral-500">{label}</span>
      <span className="min-w-0 flex-1 break-words font-semibold text-neutral-800">{value}</span>
    </div>
  );
}
