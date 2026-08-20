"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/icons";
import type { IconName } from "@/components/icons";
import { formatDate } from "@/lib/format";

const PACK_INFO: Record<string, { name: string; icon: IconName; desc: string }> = {
  umkm: { name: "Paket UMKM", icon: "store", desc: "Jualan, hitung, dan bereskan operasional." },
  freelancer: { name: "Paket Freelancer", icon: "briefcase", desc: "Tarif, dokumen, dan project." },
  creator: { name: "Paket Creator", icon: "camera", desc: "Foto, materi jualan, dan output siap pakai." },
  "creator-seller": { name: "Paket Creator / Seller", icon: "camera", desc: "Foto, materi jualan, dan output siap pakai." },
  all: { name: "Paket Semua", icon: "tools", desc: "Seluruh tools SiapinAja." },
};

export default function AccountPage() {
  const { session, entitlement, loading } = useAuth();
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState("");
  const [redeemError, setRedeemError] = useState(false);

  if (loading) return <p className="py-16 text-center text-sm text-ink-secondary">Memuat status akun…</p>;

  if (!session) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-border bg-surface p-8 text-center">
        <Icon name="lock" className="mx-auto size-6 text-ink-faint" />
        <h1 className="mt-3 text-lg font-bold text-ink">Belum masuk</h1>
        <p className="mt-1 text-sm text-ink-secondary">Masuk dulu untuk melihat status akunmu.</p>
        <a href="/login" className="mt-5 inline-block rounded-md border border-accent bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong">Masuk</a>
      </div>
    );
  }

  const activePackages = entitlement?.packages ?? [];

  async function redeem() {
    if (!code.trim() || redeeming) return;
    setRedeeming(true);
    setRedeemMessage("");
    setRedeemError(false);
    const response = await fetch("/api/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const data = await response.json().catch(() => null);
    setRedeeming(false);
    if (!response.ok) {
      setRedeemError(true);
      setRedeemMessage(data?.error?.message ?? "Kode belum dapat diproses.");
      return;
    }
    setRedeemMessage(`${data.message} Aktif sampai ${formatDate(data.expiresAt)}.`);
    setCode("");
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-xl font-bold text-accent-ink">{session.name.slice(0, 1).toUpperCase()}</span>
        <div><h1 className="text-xl font-bold text-ink">{session.name}</h1><p className="text-sm text-ink-secondary">{session.email}</p></div>
      </header>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Aktivasi Kode</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">Masukkan kode aktivasi yang kamu terima setelah pembayaran manual dikonfirmasi oleh admin.</p>
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void redeem(); }}>
          <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="SIAJ-UMKM-XXXX-XXXX-XXXX" autoComplete="off" className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2.5 font-mono text-sm text-ink placeholder:font-sans placeholder:text-ink-faint" />
          <button type="submit" disabled={redeeming || !code.trim()} className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50">{redeeming ? "Memproses…" : "Aktifkan"}</button>
        </form>
        {redeemMessage && <p className={`mt-3 text-xs ${redeemError ? "text-danger" : "text-success"}`}>{redeemMessage}</p>}
        <p className="mt-3 text-[11px] text-ink-faint">Setiap kode hanya dapat dipakai satu kali dan paket ditentukan otomatis dari kode.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Status Paket</h2>
            <p className="mt-1 text-xs text-ink-faint">Setiap paket memiliki masa aktifnya sendiri.</p>
          </div>
          <span className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success">
            {entitlement?.status === "active" ? "Ada paket aktif" : "Tidak ada paket aktif"}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {activePackages.length === 0 && <p className="text-sm text-ink-secondary">Tidak ada paket aktif.</p>}
          {activePackages.map((pkg) => {
            const info = PACK_INFO[pkg.slug] ?? { name: pkg.slug, icon: "tools" as const, desc: "" };
            const isActive = pkg.status === "active";
            return (
              <div key={`${pkg.slug}:${pkg.expiresAt}`} className="flex items-center gap-3 rounded-md border border-border bg-surface-muted/50 px-4 py-3">
                <span className={`flex size-9 items-center justify-center rounded-md ${isActive ? "bg-accent-soft text-accent-strong" : "bg-surface-muted text-ink-faint"}`}>
                  <Icon name={info.icon} className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{info.name}</p>
                  <p className="text-[12px] text-ink-faint">{info.desc}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isActive ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
                    {isActive ? "Aktif" : "Kedaluwarsa"}
                  </span>
                  <p className="mt-1 text-[11px] text-ink-faint">s/d {formatDate(pkg.expiresAt)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {entitlement && activePackages.length > 0 && (
          <p className="mt-4 text-[12px] text-ink-faint">
            Masa aktif setiap paket dihitung dan diverifikasi secara terpisah. Mengaktifkan paket baru tidak memperpanjang atau mengatur ulang paket lain.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Data & Privasi</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-secondary"><li className="flex items-start gap-2"><Icon name="check" className="mt-0.5 size-4 shrink-0 text-success" />Project kerja tersimpan sepenuhnya di perangkat ini.</li><li className="flex items-start gap-2"><Icon name="check" className="mt-0.5 size-4 shrink-0 text-success" />Ekspor JSON kapan saja untuk pindah device.</li></ul>
      </div>
    </div>
  );
}
