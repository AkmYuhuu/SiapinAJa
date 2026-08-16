"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { LegalFooter } from "@/components/legal/legal-footer";

const DRAFT_KEY = "siapinaja:register-draft";

type Draft = { name?: string; email?: string; termsAccepted?: boolean; privacyAccepted?: boolean };

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Draft;
      setName(draft.name ?? "");
      setEmail(draft.email ?? "");
      setTermsAccepted(draft.termsAccepted === true);
      setPrivacyAccepted(draft.privacyAccepted === true);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ name, email, termsAccepted, privacyAccepted }));
    } catch {}
  }, [name, email, termsAccepted, privacyAccepted]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted || !privacyAccepted) {
      setError("Kamu wajib menyetujui Syarat & Ketentuan dan Kebijakan Privasi.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, termsAccepted, privacyAccepted }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: { message?: string } };
      if (!res.ok) throw new Error(data.error?.message || "Gagal mendaftar. Coba lagi.");
      try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
      setDone(true);
      toast("Akun dibuat. Silakan cek email untuk verifikasi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mendaftar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-accent"><Icon name="tools" className="size-4 text-white" /></span>
            <span className="text-base font-bold tracking-tight text-ink">Siapin<span className="text-accent-strong">Aja</span></span>
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 items-start gap-10 px-4 py-10 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-6 lg:p-8">
          <h1 className="text-xl font-bold text-ink">Buat Akun</h1>
          <p className="mt-1 text-sm text-ink-secondary">Satu akun untuk semua tools - pekerjaan tetap di perangkatmu.</p>

          {done ? (
            <div className="mt-6 rounded-lg border border-border bg-surface-muted p-6 text-center">
              <Icon name="check" className="mx-auto size-8 text-success" />
              <p className="mt-3 text-sm font-semibold text-ink">Pendaftaran berhasil</p>
              <p className="mt-1 text-[13px] text-ink-secondary">Kami sudah mengirim email verifikasi. Klik tautan verifikasi di email sebelum masuk.</p>
              <Button className="mt-5" size="lg" onClick={() => router.push("/login")}>Ke Halaman Masuk</Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <Field label="Nama"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kamu" required autoFocus /></Field>
              <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kamu@email.com" required /></Field>
              <Field label="Kata sandi"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter" minLength={8} required /></Field>
              <label className="flex items-start gap-2.5 text-[13px] text-ink-secondary">
                <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1 size-4 accent-[var(--accent)]" required />
                <span>Saya setuju dengan <Link href={`/terms?returnTo=${encodeURIComponent("/register")}`} className="font-semibold text-accent-strong hover:underline">Syarat & Ketentuan</Link>.</span>
              </label>
              <label className="flex items-start gap-2.5 text-[13px] text-ink-secondary">
                <input type="checkbox" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} className="mt-1 size-4 accent-[var(--accent)]" required />
                <span>Saya telah membaca dan menyetujui <Link href={`/privacy?returnTo=${encodeURIComponent("/register")}`} className="font-semibold text-accent-strong hover:underline">Kebijakan Privasi</Link>.</span>
              </label>
              {error && <p className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-danger">{error}</p>}
              <Button type="submit" loading={busy} className="w-full" size="lg">Daftar</Button>
            </form>
          )}

          <p className="mt-6 text-center text-[13px] text-ink-secondary">Sudah punya akun? <Link href="/login" className="font-semibold text-accent-strong hover:underline">Masuk</Link></p>
        </div>

        <div className="hidden rounded-lg border border-dashed border-border-strong bg-surface/60 p-8 lg:block">
          <Icon name="lock" className="size-6 text-ink-faint" />
          <h2 className="mt-4 text-lg font-bold text-ink">Kenapa perlu akun?</h2>
          <ul className="mt-5 space-y-2.5 text-sm text-ink-secondary">
            {["Akses tools premium diverifikasi ke server", "Status paket aktif dikelola backend", "Draft dan project tetap aman di perangkatmu"].map((t) => <li key={t} className="flex items-start gap-2"><Icon name="check" className="mt-0.5 size-4 shrink-0 text-success" />{t}</li>)}
          </ul>
        </div>
      </main>
      <LegalFooter returnTo="/register" />
    </div>
  );
}
