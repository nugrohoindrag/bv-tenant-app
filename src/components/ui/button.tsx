import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-gradient-brand text-white shadow-[0_6px_18px_rgb(31_155_179/0.28)] disabled:bg-none disabled:bg-neutral-200 disabled:text-white disabled:shadow-none",
  outline: "border border-brand-500 text-brand-600 bg-card",
  ghost: "text-brand-600 bg-transparent",
  danger: "bg-critical text-white",
  soft: "bg-brand-50 text-brand-700",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-full",
  md: "h-11 px-5 text-[15px] rounded-full",
  lg: "h-14 px-6 text-lg rounded-full",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant = "primary", size = "md", loading, block, disabled, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "tap inline-flex select-none items-center justify-center gap-2 font-bold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-90",
        variants[variant],
        sizes[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="animate-spin" size={18} />}
      {children}
    </button>
  );
});
