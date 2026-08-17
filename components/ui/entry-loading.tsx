"use client";

import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand/logo";

export function EntryLoading() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const showTimer = window.setTimeout(() => setVisible(true), 120);
    const hideTimer = window.setTimeout(() => setVisible(false), 450);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
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
        <div className="flex flex-col items-center animate-[workspace-logo_300ms_ease-out_both]">
          <BrandMark className="size-16 shrink-0 rounded-[18px] shadow-[0_12px_30px_rgba(255,95,0,0.18)] ring-1 ring-black/5" />
          <span className="mt-4 text-xl font-bold tracking-tight text-ink">
            Siapin<span className="text-accent-strong">Aja</span>
          </span>
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Early Access
          </span>
        </div>

        <p className="mt-5 text-sm font-medium text-ink animate-[workspace-copy_320ms_60ms_ease-out_both]">
          Menyiapkan ruang kerjamu...
        </p>

        <div className="mt-6 flex items-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((item) => (
            <span
              key={item}
              className="size-1.5 rounded-full bg-accent animate-[workspace-dot_650ms_ease-in-out_infinite]"
              style={{ animationDelay: `${item * 100}ms` }}
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
