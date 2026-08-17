"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { LegalFooter } from "@/components/legal/legal-footer";
import { useAuth } from "@/components/auth/auth-provider";
import { BrandMark } from "@/components/brand/logo";

const DRAFT_KEY = "siapinaja:login-draft";
type Draft = { email?: string; termsAccepted?: boolean; privacyAccepted?: boolean };

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Draft;
      setEmail(draft.email ?? "");
      setTermsAccepted(draft.termsAccepted === true);
      setPrivacyAccepted(draft.privacyAccepted === true);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ email, termsAccepted, privacyAccepted }));
    } catch {}
  }, [email, termsAccepted, privacyAccepted]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!termsAccepted || !privacyAccepted) {
      setError("Kamu wajib menyetujui Syarat & Ketentuan dan Kebijakan Privasi.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await login(email, password, { termsAccepted, privacyAccepted });
      try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
      toast("Selamat datang kembali.");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <main className="mx-auto flex w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
        <div className="grid min-h-[calc(100vh-2rem)] w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_20px_70px_rgba(43,40,35,0.09)] lg:grid-cols-[42%_58%] sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)]">
          <section className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_20%_10%,rgba(255,224,188,0.95),transparent_38%),linear-gradient(145deg,#ffb35a_0%,#ff7617_45%,#f04a08_100%)] px-8 py-10 text-white lg:flex lg:flex-col lg:items-center lg:justify-center lg:text-center">
            <div className="absolute -right-24 -top-24 size-72 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-white/10 blur-2xl" />

            <div className="relative z-10 flex items-center justify-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-white/95 p-1.5 shadow-[0_12px_28px_rgba(104,39,0,0.22)]">
                <BrandMark className="size-full rounded-[14px]" />
              </div>
            </div>

            <div className="relative z-10 mt-7 flex max-w-md flex-col items-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">Early Access</p>
              <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
                Siapin<span className="text-white/95">Aja</span>
              </h1>
              <p className="mt-4 max-w-sm text-base leading-relaxed text-white/85">
                Semua tools yang kamu butuhkan, siap di satu tempat.
              </p>
            </div>

            <div className="relative z-10 mt-10 grid w-full max-w-md grid-cols-2 gap-3 text-center">
              {[
                ["calculator", "Hitung harga"],
                ["file", "Buat dokumen"],
                ["camera", "Siapkan materi"],
                ["download", "Ambil hasil"],
              ].map(([icon, label]) => (
                <div key={label} className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                  <div className="mx-auto flex size-9 items-center justify-center rounded-lg bg-white/90 text-accent-strong">
                    <Icon name={icon as "calculator" | "file" | "camera" | "download"} className="size-4.5" />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-white/90">{label}</p>
                </div>
              ))}
            </div>

            <div className="relative z-10 mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
              Kerja lebih siap. Lebih sederhana.
            </div>
          </section>

          <section className="flex min-w-0 flex-col bg-surface px-5 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            <header className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 lg:hidden">
                <BrandMark className="size-8 shrink-0" />
                <span className="flex flex-col leading-tight">
                  <span className="text-base font-bold tracking-tight text-ink">Siapin<span className="text-accent-strong">Aja</span></span>
                  <span className="text-[8px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Early Access</span>
                </span>
              </Link>
              <span className="ml-auto text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Masuk</span>
            </header>

            <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-strong">Akses workspace</p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Masuk ke akun Anda</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-secondary">Lanjutkan pekerjaanmu dari mana pun terakhir berhenti.</p>
              </div>

              <form onSubmit={submit} className="mt-8 space-y-4">
                <Field label="Email">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" required autoFocus />
                </Field>
                <Field label="Kata sandi">
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan kata sandi" required />
                </Field>

                <div className="flex items-start justify-between gap-4 text-xs text-ink-secondary">
                  <label className="flex items-start gap-2.5">
                    <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" required />
                    <span>Saya setuju dengan <Link href={`/terms?returnTo=${encodeURIComponent("/login")}`} className="font-semibold text-accent-strong hover:underline">Syarat & Ketentuan</Link>.</span>
                  </label>
                </div>
                <label className="flex items-start gap-2.5 text-xs text-ink-secondary">
                  <input type="checkbox" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" required />
                  <span>Saya telah membaca dan menyetujui <Link href={`/privacy?returnTo=${encodeURIComponent("/login")}`} className="font-semibold text-accent-strong hover:underline">Kebijakan Privasi</Link>.</span>
                </label>

                {error && <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-[13px] text-danger">{error}</p>}

                <Button type="submit" loading={busy} className="mt-2 w-full" size="lg">Masuk</Button>
              </form>

              <p className="mt-6 text-center text-sm text-ink-secondary">
                Belum punya akun? <Link href="/register" className="font-semibold text-accent-strong hover:underline">Daftar sekarang</Link>
              </p>
            </div>

            <LegalFooter returnTo="/login" />
          </section>
        </div>
      </main>
    </div>
  );
}
