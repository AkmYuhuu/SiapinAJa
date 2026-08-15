"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/icons";
import type { IconName } from "@/components/icons";
import { formatDate } from "@/lib/format";

const PACK_INFO: Record<string, { name: string; icon: IconName; desc: string }> = {
  umkm: { name: "Paket UMKM", icon: "store", desc: "Jualan, hitung, dan bereskan operasional." },
  freelancer: { name: "Paket Freelancer", icon: "briefcase", desc: "Tarif, dokumen, dan project." },
  creator: { name: "Paket Creator", icon: "camera", desc: "Foto, materi jualan, dan output siap pakai." },
  all: { name: "Paket Semua", icon: "tools", desc: "Seluruh tools SiapinAja." },
};

export default function AccountPage() {
  const { session, entitlement, loading } = useAuth();

  if (loading) {
    return <p className="py-16 text-center text-sm text-ink-secondary">Memuat status akun…</p>;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-border bg-surface p-8 text-center">
        <Icon name="lock" className="mx-auto size-6 text-ink-faint" />
        <h1 className="mt-3 text-lg font-bold text-ink">Belum masuk</h1>
        <p className="mt-1 text-sm text-ink-secondary">Masuk dulu untuk melihat status akunmu.</p>
        <a href="/login" className="mt-5 inline-block rounded-md border border-accent bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong">
          Masuk
        </a>
      </div>
    );
  }

  const entitlements = entitlement?.packs ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-xl font-bold text-accent-ink">
          {session.name.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <h1 className="text-xl font-bold text-ink">{session.name}</h1>
          <p className="text-sm text-ink-secondary">{session.email}</p>
        </div>
      </header>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Status Paket</h2>
        {entitlement ? (
          <>
            <div className="mt-4 space-y-3">
              {entitlements.length === 0 && <p className="text-sm text-ink-secondary">Tidak ada paket aktif.</p>}
              {entitlements.map((p) => {
                const info = PACK_INFO[p] ?? { name: p, icon: "tools" as const, desc: "" };
                const active = entitlement.status === "active";
                return (
                  <div key={p} className="flex items-center gap-3 rounded-md border border-border bg-surface-muted/50 px-4 py-3">
                    <span className={`flex size-9 items-center justify-center rounded-md ${active ? "bg-accent-soft text-accent-strong" : "bg-surface-muted text-ink-faint"}`}>
                      <Icon name={info.icon} className="size-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{info.name}</p>
                      <p className="text-[12px] text-ink-faint">{info.desc}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        active ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                      }`}
                    >
                      {active ? "Aktif" : "Kedaluwarsa"}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[13px] text-ink-secondary">
              Masa aktif s/d <strong className="text-ink">{formatDate(entitlement.expiresAt)}</strong>
            </p>
            <p className="mt-1 text-[12px] text-ink-faint">
              Status ini diverifikasi ke server - bukan dari perangkatmu.
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm text-ink-secondary">Status paket belum dapat dimuat.</p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Data & Privasi</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-secondary">
          <li className="flex items-start gap-2">
            <Icon name="check" className="mt-0.5 size-4 shrink-0 text-success" />
            Project kerja tersimpan sepenuhnya di perangkat ini.
          </li>
          <li className="flex items-start gap-2">
            <Icon name="check" className="mt-0.5 size-4 shrink-0 text-success" />
            Ekspor JSON kapan saja untuk pindah device.
          </li>
        </ul>
      </div>
    </div>
  );
}