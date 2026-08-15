"use client";

import type { ReactNode } from "react";

export interface TabItem {
  key: string;
  label: ReactNode;
  count?: number;
}

export function Tabs({
  tabs,
  active,
  onChange,
  className = "",
}: {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 border-b border-border ${className}`} role="tablist">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.key)}
            className={`relative -mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors cursor-pointer ${
              isActive
                ? "border-accent font-semibold text-ink"
                : "border-transparent text-ink-secondary hover:text-ink"
            }`}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular ${
                  isActive ? "bg-accent-surface text-accent-ink" : "bg-surface-muted text-ink-faint"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: Array<{ value: T; label: ReactNode }>;
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-0.5 rounded-md border border-border bg-surface-muted p-0.5 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
            value === o.value ? "bg-surface text-ink shadow-sm border border-border" : "text-ink-secondary hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}