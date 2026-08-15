"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

export function Dropzone({
  onFiles,
  accept,
  multiple = true,
  title = "Drop file di sini",
  hint,
  icon = "upload",
  children,
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  title?: string;
  hint?: string;
  icon?: "upload" | "image";
  children?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={title}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onFiles(files);
      }}
      className={`flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors ${
        dragging ? "border-accent bg-accent-soft" : "border-border-strong bg-surface hover:border-accent/50 hover:bg-surface"
      }`}
    >
      <span className="flex size-12 items-center justify-center rounded-lg bg-surface-muted text-ink-faint">
        <Icon name={icon} className="size-6" />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="max-w-xs text-[13px] text-ink-secondary">
        {hint ?? "atau pilih file dari perangkatmu. Semua diproses di browser - tidak ada yang diunggah."}
      </p>
      {children}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}