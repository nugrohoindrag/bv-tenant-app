// Input/Select/Textarea. Variant "underline" mengikuti Figma register (label kecil + garis bawah), "box" untuk form lain.
import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface BaseProps {
  label?: string;
  error?: string | null;
  hint?: string;
  variant?: "underline" | "box";
  leading?: ReactNode;
  trailing?: ReactNode;
}

function Wrapper({ id, label, error, hint, variant = "underline", children, className }: BaseProps & { id: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col", className)}>
      {label && (
        <label htmlFor={id} className={cn("mb-1 text-[13px] font-semibold", error ? "text-critical" : "text-neutral-text")}>
          {label}
        </label>
      )}
      <div
        className={cn(
          "flex items-center gap-2 transition",
          variant === "underline" && ["border-b-2 bg-transparent px-0 py-2", error ? "border-critical" : "border-neutral-800 focus-within:border-brand-600"],
          variant === "box" && ["rounded-lg border bg-card px-3 py-2.5", error ? "border-critical" : "border-neutral-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100"],
        )}
      >
        {children}
      </div>
      {error ? <div className="mt-1 text-xs text-critical">{error}</div> : hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className">, BaseProps {
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, hint, variant, leading, trailing, className, id: idProp, type, ...rest }, ref) {
  const gen = useId();
  const id = idProp ?? gen;
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} variant={variant} className={className}>
      {leading && <span className="text-brand-600">{leading}</span>}
      <input
        ref={ref}
        id={id}
        type={isPassword ? (show ? "text" : "password") : type}
        className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-neutral-400"
        aria-invalid={!!error}
        {...rest}
      />
      {isPassword ? (
        <button type="button" onClick={() => setShow((s) => !s)} className="text-neutral-500" aria-label={show ? "Sembunyikan password" : "Tampilkan password"}>
          {show ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      ) : (
        trailing
      )}
    </Wrapper>
  );
});

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "className">, BaseProps {
  className?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, error, hint, variant, className, id: idProp, options, placeholder, value, ...rest }, ref) {
  const gen = useId();
  const id = idProp ?? gen;
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} variant={variant} className={className}>
      <select
        ref={ref}
        id={id}
        value={value ?? ""}
        className={cn("min-w-0 flex-1 appearance-none bg-transparent text-[15px] font-semibold outline-none", !value && "text-neutral-400 font-normal")}
        aria-invalid={!!error}
        {...rest}
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={18} className="pointer-events-none text-neutral-800" />
    </Wrapper>
  );
});

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">, BaseProps {
  className?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, error, hint, className, id: idProp, ...rest }, ref) {
  const gen = useId();
  const id = idProp ?? gen;
  return (
    <div className={cn("flex flex-col", className)}>
      {label && (
        <label htmlFor={id} className="mb-1 text-[13px] font-semibold text-neutral-text">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className={cn(
          "min-h-[140px] w-full resize-none rounded-xl border bg-card p-4 text-[15px] leading-relaxed outline-none placeholder:text-neutral-400",
          error ? "border-critical" : "border-neutral-200 shadow-card focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
        )}
        aria-invalid={!!error}
        {...rest}
      />
      {error ? <div className="mt-1 text-xs text-critical">{error}</div> : hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
});
