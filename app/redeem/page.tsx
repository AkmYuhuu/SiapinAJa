"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function RedeemPage() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setSuccess(false);

    const response = await fetch("/api/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setMessage(data?.error?.message ?? "Kode tidak dapat diproses.");
      return;
    }

    setSuccess(true);
    setMessage(`${data.message} Aktif sampai ${new Date(data.expiresAt).toLocaleDateString("id-ID")}.`);
    setCode("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-7 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">SiapinAja</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Aktifkan kode</h1>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">
          Masukkan kode yang kamu terima setelah pembayaran dikonfirmasi. Setiap kode hanya dapat dipakai satu kali.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-ink">
            Kode aktivasi
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="SIAJ-UMKM-XXXX-XXXX-XXXX-XXXX"
              autoComplete="off"
              spellCheck={false}
              className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-3 font-mono text-sm tracking-wide text-ink outline-none focus:border-accent"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full rounded-md bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Memproses…" : "Aktifkan sekarang"}
          </button>
        </form>

        {message && (
          <div className={`mt-4 rounded-md border px-4 py-3 text-sm ${success ? "border-accent bg-accent-soft text-accent-ink" : "border-border bg-surface-muted text-ink-secondary"}`}>
            {message}
          </div>
        )}

        <Link href="/dashboard" className="mt-5 block text-center text-xs font-semibold text-accent-strong hover:underline">
          Kembali ke dashboard
        </Link>
      </section>
    </main>
  );
}
