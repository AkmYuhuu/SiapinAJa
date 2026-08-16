"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";

export function EarlyAccessNotice() {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div className="absolute inset-x-0 top-0 z-[80] flex min-h-screen items-center justify-center bg-black/40 px-4 py-8 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="early-access-title"
        className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-[0_20px_60px_rgba(43,40,35,0.2)]"
      >
        <div className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
          <Icon name="spark" className="size-5" />
        </div>
        <h2 id="early-access-title" className="mt-4 text-lg font-bold text-ink">
          SiapinAja masih dalam Early Access
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          Website ini sedang terus dikembangkan. Beberapa fitur, alur, dan tampilan masih bisa berubah,
          diperbaiki, atau ditambahkan seiring update berikutnya.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          Kamu bisa menemukan perubahan, perbaikan bug, dan penyempurnaan fitur secara berkala selama fase Early Access.
        </p>
        <div className="mt-5 rounded-lg border border-border bg-surface-muted px-3.5 py-3 text-xs leading-relaxed text-ink-secondary">
          Dengan melanjutkan, kamu memahami bahwa pengalaman Early Access belum sepenuhnya final.
        </div>
        <Button className="mt-5 w-full" size="lg" onClick={() => setOpen(false)}>
          Paham, lanjutkan
        </Button>
      </div>
    </div>
  );
}
