"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";

const INTRO_KEY = "siapinaja:workspace-intro:v1";

export function WorkspaceIntro() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(INTRO_KEY) === "1") return;
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      // If storage is unavailable, keep the intro one-time for this mount.
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 1450);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-bg px-6"
      role="status"
      aria-live="polite"
      aria-label="Menyiapkan ruang kerja"
    >
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="flex items-center gap-3 animate-[workspace-logo_400ms_ease-out_both]">
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent shadow-sm">
            <Icon name="tools" className="size-5 text-white" />
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span className="text-lg font-bold tracking-tight text-ink">
              Siapin<span className="text-accent-strong">Aja</span>
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Early Access</span>
          </span>
        </div>

        <p className="mt-6 text-sm font-medium text-ink animate-[workspace-copy_450ms_120ms_ease-out_both]">
          Menyiapkan ruang kerjamu...
        </p>

        <div className="mt-8 grid w-full max-w-[280px] grid-cols-3 gap-2.5" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="h-14 rounded-lg border border-border bg-surface shadow-sm animate-[workspace-card_420ms_ease-out_both]"
              style={{ animationDelay: `${260 + item * 70}ms` }}
            >
              <div className="flex h-full items-center px-3">
                <span className="size-7 rounded-md bg-accent-soft" />
                <span className="ml-2 flex-1 space-y-1.5">
                  <span className="block h-1.5 w-2/3 rounded bg-surface-muted" />
                  <span className="block h-1.5 w-1/2 rounded bg-surface-muted" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes workspace-logo {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes workspace-copy {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes workspace-card {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
