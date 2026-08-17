"use client";

import { useEffect, useState } from "react";
import { BRAND_LOGO_DATA_URL } from "@/lib/brand";

export function EntryLoading() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // This component is mounted once by the root layout. Because Next.js
    // keeps the root layout mounted during client-side navigation, an empty
    // dependency list makes the intro run only after a full document load:
    // refresh, direct URL entry, or a new tab.
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-bg px-6"
      role="status"
      aria-live="polite"
      aria-label="Menyiapkan SiapinAja"
    >
      <div className="flex flex-col items-center text-center">
        <div className="flex flex-col items-center animate-[workspace-logo_360ms_ease-out_both]">
          <span className="flex size-16 overflow-hidden rounded-[18px] bg-accent shadow-[0_12px_30px_rgba(255,95,0,0.22)] ring-1 ring-black/5">
            <img src={BRAND_LOGO_DATA_URL} alt="SiapinAja" className="size-full object-cover" />
          </span>
          <span className="mt-4 text-xl font-bold tracking-tight text-ink">
            Siapin<span className="text-accent-strong">Aja</span>
          </span>
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Early Access
          </span>
        </div>

        <p className="mt-5 text-sm font-medium text-ink animate-[workspace-copy_380ms_80ms_ease-out_both]">
          Menyiapkan ruang kerjamu...
        </p>

        <div className="mt-6 flex items-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((item) => (
            <span
              key={item}
              className="size-1.5 rounded-full bg-accent animate-[workspace-dot_700ms_ease-in-out_infinite]"
              style={{ animationDelay: `${item * 120}ms` }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes workspace-logo {
          from { opacity: 0; transform: translateY(7px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes workspace-copy {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes workspace-dot {
          0%, 100% { opacity: 0.35; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
}
