"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import type { ExcelImportOutcome } from "@/lib/excel";

export function ExcelImportDialog({
  open,
  fileName,
  outcome,
  onCancel,
  onConfirm,
  confirmLabel,
}: {
  open: boolean;
  fileName: string;
  outcome: ExcelImportOutcome | null;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
}) {
  if (!outcome) return null;
  return (
    <Modal open={open} onClose={onCancel} title="Pratinjau Import Excel" width="max-w-lg">
      <p className="mb-3 truncate text-[13px] text-ink-secondary">{fileName}</p>

      {outcome.fatal ? (
        <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
          <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
          <p>{outcome.fatal}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border bg-surface-muted/40 p-3 text-[13px]">
            <SummaryRow label="Baris data" value={String(outcome.totalRows)} />
            <SummaryRow label="Kolom dikenali" value={String(outcome.headers.length)} />
            <SummaryRow label="Baris valid" value={String(outcome.validRows)} />
            <SummaryRow label="Baris bermasalah" value={String(outcome.invalidRows)} />
            <SummaryRow label="Sheet" value={outcome.sheetName || "—"} />
            <SummaryRow label="Tipe file" value="Excel (.xlsx)" />
          </div>

          {outcome.unusedColumns.length > 0 && (
            <p className="mt-2 text-[12px] text-ink-faint">
              {outcome.unusedColumns.length} kolom tidak digunakan: {outcome.unusedColumns.join(", ")}
            </p>
          )}

          {outcome.errors.length > 0 && (
            <div className="mt-3 max-h-44 overflow-y-auto rounded-lg border border-border bg-surface-muted/40 p-3">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Baris bermasalah</p>
              <ul className="space-y-1.5 text-[12px] text-ink-secondary">
                {outcome.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>
                    <span className="font-medium text-ink">Baris {e.row}:</span> {e.message}
                    {e.value ? <span className="text-ink-faint"> ({e.value})</span> : null}
                  </li>
                ))}
                {outcome.errors.length > 20 && (
                  <li className="text-ink-faint">… dan {outcome.errors.length - 20} error lainnya</li>
                )}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Batal
        </Button>
        {!outcome.fatal && (
          <Button onClick={onConfirm} disabled={outcome.validRows === 0}>
            <Icon name="upload" className="size-3.5" />
            {confirmLabel ?? `Import ${outcome.validRows} Baris`}
          </Button>
        )}
      </div>
    </Modal>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-ink-secondary">{label}</span>
      <span className="font-semibold tabular text-ink">{value}</span>
    </div>
  );
}
