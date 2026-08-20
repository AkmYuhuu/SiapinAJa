"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useAuth } from "@/components/auth/auth-provider";

const FEEDBACK_URL = "https://forms.gle/yrmGMFf8ZvtRLa849";
const DISMISSED_KEY = "siapinaja:early-access-feedback-popup-dismissed";

export function EarlyAccessExpiryPopup() {
  const { entitlement, loading } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading || !entitlement?.earlyAccessExpiresAt) return;

    const expiresAt = new Date(entitlement.earlyAccessExpiresAt).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt > Date.now()) return;

    try {
      if (localStorage.getItem(DISMISSED_KEY) === "1") return;
    } catch {
      // Continue without persistence if browser storage is unavailable.
    }

    setVisible(true);
  }, [entitlement?.earlyAccessExpiresAt, loading]);

  if (!visible) return null;

  const complete = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Navigation should still work even if storage is blocked.
    }
    setVisible(false);
    window.location.href = FEEDBACK_URL;
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="early-access-expiry-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#e8e3da] bg-white shadow-[0_28px_80px_rgba(43,40,35,0.2)]"
      >
        <div className="flex items-center gap-3 border-b border-[#eeeae2] px-6 py-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#fff0e5] text-accent-strong">
            <Icon name="check" className="size-5" />
          </span>
          <div>
            <h2 id="early-access-expiry-title" className="text-base font-bold text-ink">
              Terima kasih sudah ikut Early Access
            </h2>
            <p className="mt-0.5 text-xs text-ink-faint">Masa Early Access kamu sudah selesai.</p>
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm leading-6 text-ink-secondary">
            Terima kasih sudah mencoba SiapinAja selama Early Access. Bantu kami memperbaiki produk ini dengan mengisi feedback singkat tentang pengalamanmu.
          </p>

          <button
            type="button"
            onClick={complete}
            className="mt-6 w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
          >
            Paham
          </button>
        </div>
      </div>
    </div>
  );
}
