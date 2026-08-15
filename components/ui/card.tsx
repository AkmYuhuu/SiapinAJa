import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  pad = true,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <div className={`bg-surface border border-border rounded-lg ${pad ? "p-4" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`text-[13px] font-semibold uppercase tracking-wide text-ink-secondary ${className}`}>
      {children}
    </h2>
  );
}

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-ink-secondary border border-border",
  accent: "bg-accent-surface text-accent-ink border border-accent/30",
  success: "bg-success-soft text-success border border-success/25",
  warning: "bg-warning-soft text-warning border border-warning/25",
  danger: "bg-danger-soft text-danger border border-danger/25",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatBlock({
  label,
  value,
  sub,
  accent = false,
  className = "",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border p-3.5 ${accent ? "border-accent/40 bg-accent-soft" : "border-border bg-surface"} ${className}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-secondary">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular ${accent ? "text-accent-strong" : "text-ink"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-faint">{sub}</p>}
    </div>
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return <div className={`h-px bg-border ${className}`} />;
}