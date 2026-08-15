"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="anim-fade-in fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`anim-fade-up flex max-h-[calc(100dvh-2rem)] w-full ${width} flex-col rounded-lg border border-border bg-surface shadow-[0_16px_48px_rgba(43,40,35,0.2)]`}>
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            <button
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded text-ink-secondary hover:bg-surface-muted hover:text-ink"
              aria-label="Tutup"
            >
              <svg className="size-4" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}