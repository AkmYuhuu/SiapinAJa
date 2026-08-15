import type { ReactNode } from "react";
import { Button } from "./button";

export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  compact = false,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface/60 text-center ${compact ? "px-4 py-8" : "px-6 py-14"}`}>
      {icon && <div className="mb-3 flex size-11 items-center justify-center rounded-lg bg-surface-muted text-ink-faint">{icon}</div>}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-ink-secondary">{description}</p>}
      {(action || actionLabel) && (
        <div className="mt-4">
          {action ?? (
            <Button variant="secondary" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-surface-muted ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${pct}%` }} />
    </div>
  );
}