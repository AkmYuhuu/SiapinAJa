"use client";

import Link from "next/link";
import { getCategory } from "@/lib/registry";
import type { ToolDef } from "@/lib/registry";
import type { AccessReason } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";

// Locked screen for premium tool access (spec §12). Rendered by the
// server-side guard (authority) and reused by the client UX gate. Each
// reason shows a distinct message - never collapse everything to "expired".

export function ToolLocked({ tool, reason }: { tool: ToolDef; reason: AccessReason }) {
  const category = getCategory(tool.category);
  const packName = category?.name ?? "Paket";

  const message =
    reason === "no-session"
      ? "Masuk dulu untuk membuka tool ini."
      : reason === "expired"
        ? "Masa aktif akunmu sudah berakhir."
        : reason === "not-entitled"
          ? "Tool ini tidak termasuk dalam paket akunmu."
          : reason === "disabled"
            ? "Tool sedang tidak tersedia."
            : reason === "offline"
              ? "Tidak bisa memverifikasi status akun. Periksa koneksi internet lalu coba lagi."
              : "Akses tidak dapat diverifikasi. Coba lagi.";

  return (
    <div className="rounded-lg border border-border bg-surface p-8">
      <div className="mx-auto flex max-w-md flex-col items-center py-14 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-xl bg-surface-muted">
          <Icon name="lock" className="size-7 text-ink-faint" />
        </div>
        <h1 className="text-lg font-semibold text-ink">Tool terkunci</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
          {tool.name} termasuk dalam <strong className="text-ink">Paket {packName}</strong>. {message}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link href="/pricing">
            <Button size="lg">Lihat Paket</Button>
          </Link>
          <Link href={reason === "no-session" ? "/login" : "/"}>
            <Button variant="secondary" size="lg">
              {reason === "no-session" ? "Masuk" : "Kembali ke Beranda"}
            </Button>
          </Link>
        </div>
        <p className="mt-6 text-xs text-ink-faint">
          Status akses selalu diperiksa ke server - URL saja bukan izin akses.
        </p>
      </div>
    </div>
  );
}
