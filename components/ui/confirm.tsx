"use client";

import { Modal } from "./modal";
import { Button } from "./button";
import { Icon } from "@/components/icons";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

/** Themed confirmation popup matching the SiapinAja UI, with fade/pop animation. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const danger = tone === "danger";
  return (
    <Modal open={open} onClose={onCancel} width="max-w-sm">
      <div className="flex flex-col items-center gap-4 pb-1 pt-2 text-center">
        <span
          className={`anim-fade-up flex size-13 items-center justify-center rounded-full ${
            danger ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"
          }`}
        >
          <Icon name={danger ? "trash" : "alert"} className="size-6" />
        </span>
        <div>
          <h3 className="text-base font-bold text-ink">{title}</h3>
          {description && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">{description}</p>}
        </div>
        <div className="mt-2 flex w-full gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "secondary"} className="flex-1" onClick={onConfirm}>
            <Icon name={danger ? "trash" : "check"} className="size-3.5" />
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
