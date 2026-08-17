"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { BrandMark } from "@/components/brand/logo";

const STORAGE_PREFIX = "siapinaja:early-access-ended:";

export function EarlyAccessEndedNotice() {
  const { session, entitlement } = useAuth();
  const [visible, setVisible] = useState(false);
  const feedbackUrl = process.env.NEXT_PUBLIC_EARLY_ACCESS_FEEDBACK_URL?.trim() ?? "";

  const expiry = useMemo(() => entitlement?.earlyAccessExpiresAt ?? "", [entitlement?.earlyAccessExpiresAt]);
  const storageKey = session && expiry ? `${STORAGE_PREFIX}${session.userId}:${expiry}` : "";

  useEffect(() => {
    if (!session || !expiry || !storageKey) return;
    const expiresAtMs = new Date(expiry).getTime();
    if (!Number.isFinite(expiresAtMs) || Date.now() < expiresAtMs) return;

    try {
      if (window.localStorage.getItem(storageKey) === "shown") return;
      window.localStorage.setItem(storageKey, "shown");
    } catch {
      return;
    }

    setVisible(true);
  }, [session, expiry, storageKey]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-[2px]">
      <div role="dialog" aria-modal="true" aria-labelledby="early-access-ended-title" className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-[0_24px_80px_rgba(43,40,35,0.22)]">
        <div className="flex items-start gap-3">
          <BrandMark className="size-12 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-strong">Early Access selesai</p>
            <h2 id="early-access-ended-title" className="mt-1 text-xl font-bold tracking-tight text-ink">Terima kasih sudah ikut mencoba SiapinAja.</h2>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-ink-secondary">
          Periode Early Access kamu sudah selesai. Sebelum kami melanjutkan pengembangan, kami ingin tahu pengalamanmu selama menggunakan SiapinAja.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          Masukanmu akan membantu kami menentukan fitur mana yang benar-benar berguna untuk pelaku UMKM, freelancer, dan creator.
        </p>

        {feedbackUrl ? (
          <a href={feedbackUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex w-full items-center justify-center rounded-lg border border-accent bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-strong">
            Isi Form Feedback
          </a>
        ) : (
          <div className="mt-5 rounded-lg border border-border bg-surface-muted px-4 py-3 text-xs leading-relaxed text-ink-secondary">
            Form feedback belum dikonfigurasi. Setelah link Google Form ditambahkan oleh admin, tombol feedback akan tersedia.
          </div>
        )}

        <button type="button" onClick={() => setVisible(false)} className="mt-3 w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-ink hover:bg-surface-muted">
          OK
        </button>
      </div>
    </div>
  );
}
