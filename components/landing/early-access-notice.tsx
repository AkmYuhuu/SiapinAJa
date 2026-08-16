"use client";

import { useLayoutEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";

export function EarlyAccessNotice() {
  const [open, setOpen] = useState(true);

  useLayoutEffect(() => {
    const historyObject = window.history;
    const previousRestoration = historyObject.scrollRestoration;
    const previousOverflow = document.body.style.overflow;
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;

    historyObject.scrollRestoration = "manual";
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    if (open) {
      document.body.style.overflow = "hidden";
    }

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
      historyObject.scrollRestoration = previousRestoration;
    };
  }, [open]);

  const close = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 px-4 pt-16 backdrop-blur-[2px] sm:pt-20">
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
        <Button className="mt-5 w-full" size="lg" onClick={close}>
          Paham, lanjutkan
        </Button>
      </div>
    </div>
  );
}
