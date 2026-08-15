import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "tertiary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-white border border-accent hover:bg-accent-strong disabled:hover:bg-accent disabled:opacity-50",
  secondary:
    "bg-surface text-ink border border-border hover:bg-surface-muted hover:border-border-strong disabled:opacity-50",
  tertiary:
    "bg-transparent text-accent-strong border border-transparent hover:bg-accent-soft disabled:opacity-50",
  danger:
    "bg-danger text-white border border-danger hover:bg-[#a53426] disabled:opacity-50",
  ghost:
    "bg-transparent text-ink-secondary border border-transparent hover:bg-surface-muted hover:text-ink disabled:opacity-50",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors cursor-pointer select-none disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <SpinnerIcon className="size-3.5" />}
      {children}
    </button>
  );
}

function SpinnerIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function IconButton({
  label,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex size-8 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-muted hover:text-ink transition-colors cursor-pointer ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Spinner({ className = "size-4", label }: { className?: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg className={`animate-spin text-accent ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label}
    </span>
  );
}