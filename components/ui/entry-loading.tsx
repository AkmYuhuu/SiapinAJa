"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";

const ENTRY_PATHS = new Set(["/", "/dashboard"]);

export function EntryLoading() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ENTRY_PATHS.has(pathname)) {
      setVisible(false);
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 900);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-bg px-6"
      role="status"
      aria-live="polite"
      aria-label="Menyiapkan SiapinAja"
    >
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-3 animate-[workspace-logo_360ms_ease-out_both]">
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
