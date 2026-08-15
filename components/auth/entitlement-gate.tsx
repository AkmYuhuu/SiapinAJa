"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import type { AccessReason } from "@/lib/api/types";
import type { ToolDef } from "@/lib/registry";
import { getCategory } from "@/lib/registry";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";

// Route guard (spec §4.3): a URL is an address, not permission.
// Every premium tool page checks the server before rendering the tool.

export function EntitlementGate({
  tool,
  children,
  forceLocked = false,
}: {
  tool: ToolDef;
  children: ReactNode;
  forceLocked?: boolean;
}) {
  const [state, setState] = useState<{ phase: "loading" | "open" | "locked"; reason?: AccessReason }>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      setState({ phase: "loading" });
      const res = await api.verifyAccess(tool.pack);
      if (cancelled) return;
      if (res.access.ok && !forceLocked) setState({ phase: "open" });
      else
        setState({
          phase: "locked",
          reason: res.access.ok === false ? res.access.reason : "expired",
        });
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [tool.pack, tool.toolId, forceLocked]);

  if (state.phase === "loading") {
    return (
      <div className="flex min-h-60 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface py-16">
        <Icon name="refresh" className="size-5 animate-spin text-accent" />
        <p className="text-sm text-ink-secondary">Memeriksa status akun…</p>
      </div>
    );
  }

  if (state.phase === "locked") return <LockedScreen tool={tool} reason={state.reason} />;

  return <>{children}</>;
}

function LockedScreen({ tool, reason }: { tool: ToolDef; reason?: AccessReason }) {
  const category = getCategory(tool.category);
  const packName = category?.name ?? "Paket";
  const message =
    reason === "no-session"
      ? "Masuk dulu untuk membuka tool ini."
      : reason === "offline"
        ? "Tidak bisa memverifikasi status akun. Periksa koneksi internet lalu coba lagi."
        : `Masa aktif akunmu sudah berakhir.`;

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