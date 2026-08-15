"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { pushHistory } from "./local-prefs";
import { trackLastOpened } from "./settings";

// Lazy-load tool pages by canonical route (navigation identity), so shared
// tools like invoice/receipt keep their per-category context component.
// Keys match ToolDef.route from the registry.
const loaders: Record<string, () => Promise<{ default: ComponentType }>> = {
  "/tools/umkm/hpp": () => import("@/components/tools/pages/umkm/hpp"),
  "/tools/umkm/harga-jual": () => import("@/components/tools/pages/umkm/harga-jual"),
  "/tools/umkm/profit-analyzer": () => import("@/components/tools/pages/umkm/profit-analyzer"),
  "/tools/umkm/bep": () => import("@/components/tools/pages/umkm/bep"),
  "/tools/umkm/modal-usaha": () => import("@/components/tools/pages/umkm/modal-usaha"),
  "/tools/umkm/order-sheet": () => import("@/components/tools/pages/umkm/order-sheet"),
  "/tools/umkm/po-manager": () => import("@/components/tools/pages/umkm/po-manager"),
  "/tools/umkm/invoice": () => import("@/components/tools/pages/umkm/invoice"),
  "/tools/umkm/kwitansi": () => import("@/components/tools/pages/umkm/kwitansi"),
  "/tools/umkm/surat-jalan": () => import("@/components/tools/pages/umkm/surat-jalan"),
  "/tools/umkm/packing-list": () => import("@/components/tools/pages/umkm/packing-list"),
  "/tools/umkm/ongkir-packaging": () => import("@/components/tools/pages/umkm/ongkir-packaging"),
  "/tools/freelancer/harga-jasa": () => import("@/components/tools/pages/freelancer/harga-jasa"),
  "/tools/freelancer/project-cost": () => import("@/components/tools/pages/freelancer/project-cost"),
  "/tools/freelancer/target-income": () => import("@/components/tools/pages/freelancer/target-income"),
  "/tools/freelancer/price-package": () => import("@/components/tools/pages/freelancer/price-package"),
  "/tools/freelancer/quotation": () => import("@/components/tools/pages/freelancer/quotation"),
  "/tools/freelancer/invoice": () => import("@/components/tools/pages/freelancer/invoice"),
  "/tools/freelancer/kwitansi": () => import("@/components/tools/pages/freelancer/kwitansi"),
  "/tools/creator-seller/image-compressor": () => import("@/components/tools/pages/creator/image-compressor"),
  "/tools/creator-seller/image-resizer": () => import("@/components/tools/pages/creator/image-resizer"),
  "/tools/creator-seller/product-photo": () => import("@/components/tools/pages/creator/product-photo"),
  "/tools/creator-seller/mockup": () => import("@/components/tools/pages/creator/mockup"),
  "/tools/creator-seller/a4-layout": () => import("@/components/tools/pages/creator/a4-layout"),
  "/tools/creator-seller/label-harga": () => import("@/components/tools/pages/creator/label-harga"),
  "/tools/creator-seller/pas-foto": () => import("@/components/tools/pages/creator/pas-foto"),
  "/tools/creator-seller/jualankit": () => import("@/components/tools/pages/creator/jualankit"),
};

/** Pre-built once at module scope so dynamic components never reset during render. */
const PRELOADED: Record<string, ComponentType> = {};
for (const [route, loader] of Object.entries(loaders)) {
  PRELOADED[route] = dynamic(loader, {
    loading: ToolLoadingFallback,
    ssr: false,
  });
}
PRELOADED.__placeholder = dynamic(PlaceholderLoader, {
  loading: ToolLoadingFallback,
  ssr: false,
});

/** Lazy-loads one tool page by canonical route (spec §21: tools never ship in the initial bundle). */
export function LazyTool({ route }: { route: string }) {
  useEffect(() => {
    pushHistory(route);
    trackLastOpened(route);
  }, [route]);
  const Comp = PRELOADED[route] ?? PRELOADED.__placeholder;
  return <Comp />;
}

function PlaceholderLoader() {
  return Promise.resolve({ default: Placeholder });
}

function ToolLoadingFallback() {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface">
      <svg className="size-5 animate-spin text-accent" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="text-sm text-ink-secondary">Menyiapkan tool…</p>
    </div>
  );
}

function Placeholder() {
  return (
    <div className="rounded-lg border border-border bg-surface p-10 text-center">
      <p className="text-sm font-medium text-ink">Tool sedang dibangun</p>
      <p className="mt-1 text-[13px] text-ink-secondary">Tool ini akan segera tersedia di SiapinAja.</p>
    </div>
  );
}
