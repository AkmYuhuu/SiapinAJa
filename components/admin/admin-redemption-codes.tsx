"use client";

import { useEffect, useState } from "react";

interface PackageOption {
  slug: string;
  name: string;
  durationDays: number;
}

interface CodeRow {
  id: string;
  codePrefix: string;
  status: string;
  durationDays: number;
  packageSlug: string;
  packageName: string;
  redeemedAt: string | null;
  createdAt: string;
}

export default function AdminRedemptionCodes() {
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [packageSlug, setPackageSlug] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [generated, setGenerated] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/redemption-codes", { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(data?.error?.message ?? "Gagal memuat kode.");
      setLoading(false);
      return;
    }
    setPackages(data.packages ?? []);
    setCodes(data.codes ?? []);
    setPackageSlug((current) => current || data.packages?.[0]?.slug || "");
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function generate() {
    if (!packageSlug) return;
    setCreating(true);
    setMessage("");
    setGenerated([]);

    const response = await fetch("/api/admin/redemption-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageSlug, quantity }),
    });
    const data = await response.json().catch(() => null);
    setCreating(false);

    if (!response.ok) {
      setMessage(data?.error?.message ?? "Gagal membuat kode.");
      return;
    }

    setGenerated(data.codes ?? []);
    setMessage(`${data.codes?.length ?? 0} kode berhasil dibuat.`);
    await load();
  }

  const selectedPackage = packages.find((item) => item.slug === packageSlug);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="text-base font-bold text-ink">Buat kode aktivasi</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Generate setelah pembayaran benar-benar kamu konfirmasi. Jangan kirim kode yang sama ke dua pembeli.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <label className="text-sm font-medium text-ink">
            Paket
            <select
              value={packageSlug}
              onChange={(event) => setPackageSlug(event.target.value)}
              className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
            >
              {packages.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name} — {item.durationDays} hari
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-ink">
            Jumlah
            <input
              type="number"
              min={1}
              max={50}
              value={quantity}
              onChange={(event) => setQuantity(Math.min(50, Math.max(1, Number(event.target.value) || 1)))}
              className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
            />
          </label>

          <button
            type="button"
            onClick={generate}
            disabled={creating || !packageSlug}
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? "Membuat…" : "Generate kode"}
          </button>
        </div>

        {selectedPackage && (
          <p className="mt-3 text-xs text-ink-faint">Masa aktif: {selectedPackage.durationDays} hari sejak kode dipakai.</p>
        )}

        {message && <p className="mt-4 text-sm text-ink-secondary">{message}</p>}

        {generated.length > 0 && (
          <div className="mt-5 rounded-md border border-accent bg-accent-soft p-4">
            <p className="text-sm font-semibold text-accent-ink">Kode baru — simpan sekarang</p>
            <p className="mt-1 text-xs text-ink-secondary">Kode asli tidak disimpan di database dan tidak akan ditampilkan lagi setelah halaman di-refresh.</p>
            <textarea
              readOnly
              value={generated.join("\n")}
              rows={Math.min(10, generated.length + 1)}
              className="mt-3 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-ink"
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink">Riwayat kode</h2>
            <p className="mt-1 text-sm text-ink-secondary">Hanya prefix yang ditampilkan; kode penuh tidak disimpan plaintext.</p>
          </div>
          <button type="button" onClick={() => void load()} className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-muted">
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="mt-5 text-sm text-ink-secondary">Memuat…</p>
        ) : codes.length === 0 ? (
          <p className="mt-5 text-sm text-ink-secondary">Belum ada kode.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs text-ink-faint">
                <tr>
                  <th className="pb-2 pr-4 font-semibold">Kode</th>
                  <th className="pb-2 pr-4 font-semibold">Paket</th>
                  <th className="pb-2 pr-4 font-semibold">Status</th>
                  <th className="pb-2 font-semibold">Dibuat</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr key={code.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 font-mono text-xs">{code.codePrefix}…</td>
                    <td className="py-3 pr-4">{code.packageName}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${code.status === "active" ? "bg-success-soft text-success" : "bg-surface-muted text-ink-secondary"}`}>
                        {code.status === "active" ? "Aktif" : code.status === "redeemed" ? "Terpakai" : "Dicabut"}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-ink-secondary">{new Date(code.createdAt).toLocaleString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
