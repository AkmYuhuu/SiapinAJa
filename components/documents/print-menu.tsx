"use client";

import { useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Icon } from "@/components/icons";

export type PrintMode = "a4" | "80" | "58";

export function setPrintMode(mode: PrintMode) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-print-mode", mode);
  }
}

/**
 * Print dropdown matching the invoice tools: Kertas A4 / Nota 80 mm / Nota 58 mm.
 * Callers render the matching .doc-page / .receipt-print[data-width] nodes; the
 * global @media print CSS shows only the selected output.
 */
export function PrintMenu({
  disabled,
  compact = false,
  nota = true,
  autoPrint = true,
  onBeforePrint,
  className = "",
}: {
  disabled?: boolean;
  compact?: boolean;
  nota?: boolean;
  /** when false, only onBeforePrint is called and the caller triggers window.print() */
  autoPrint?: boolean;
  /** called with the chosen mode before window.print() (e.g. to mount the target doc) */
  onBeforePrint?: (mode: PrintMode) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const doPrint = (mode: PrintMode) => {
    setOpen(false);
    onBeforePrint?.(mode);
    setPrintMode(mode);
    if (!autoPrint) return;
    requestAnimationFrame(() => {
      if (typeof window !== "undefined") window.print();
    });
  };

  return (
    <div className="relative">
      {compact ? (
        <IconButton
          label="Print"
          aria-label="Print"
          disabled={disabled}
          className={className}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name="print" className="size-4" />
        </IconButton>
      ) : (
        <Button size="sm" variant="secondary" disabled={disabled} className={className} onClick={() => setOpen((v) => !v)}>
          <Icon name="print" className="size-3.5" />
          Print
          <Icon name="chevron" className="ml-0.5 size-3" />
        </Button>
      )}
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-[0_8px_24px_rgba(43,40,35,0.14)]">
          <button
            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[13px] hover:bg-surface-muted"
            onClick={() => doPrint("a4")}
          >
            <Icon name="file" className="size-3.5 text-ink-secondary" />
            Kertas A4
          </button>
          {nota && (
            <button
              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[13px] hover:bg-surface-muted"
              onClick={() => doPrint("80")}
            >
              <Icon name="receipt" className="size-3.5 text-ink-secondary" />
              Nota 80 mm
            </button>
          )}
          {nota && (
            <button
              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[13px] hover:bg-surface-muted"
              onClick={() => doPrint("58")}
            >
              <Icon name="receipt" className="size-3.5 text-ink-secondary" />
              Nota 58 mm
            </button>
          )}
        </div>
      )}
    </div>
  );
}