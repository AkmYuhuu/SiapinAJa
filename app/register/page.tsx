"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";
import { Icon } from "@/components/icons";
import { BrandMark } from "@/components/brand/logo";
import { Turnstile } from "@/components/security/turnstile";
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

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!termsAccepted || !privacyAccepted) {
      setError("Kamu wajib menyetujui Syarat & Ketentuan dan Kebijakan Privasi.");
      return;
    }

    const captchaToken = String(new FormData(e.currentTarget).get("turnstileToken") ?? "");
    if (!captchaToken) {
      setError("Selesaikan verifikasi anti-bot terlebih dahulu.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, termsAccepted, privacyAccepted, captchaToken }),
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
      <main className="mx-auto flex w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
        <div className="grid min-h-[calc(100vh-2rem)] w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_20px_70px_rgba(43,40,35,0.09)] sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[42%_58%]">
          <section className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_20%_10%,rgba(255,224,188,0.95),transparent_38%),linear-gradient(145deg,#ffb35a_0%,#ff7617_45%,#f04a08_100%)] px-8 py-10 text-white lg:flex lg:flex-col lg:items-center lg:justify-center lg:text-center">
            <div className="absolute -right-24 -top-24 size-72 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-white/10 blur-2xl" />

            <div className="relative z-10 flex items-center justify-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-white/95 p-1.5 shadow-[0_12px_28px_rgba(104,39,0,0.22)]">
                <BrandMark className="size-full rounded-[14px]" />
              </div>
            </div>

            <div className="relative z-10 mt-7 flex max-w-md flex-col items-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">Early Access</p>
              <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">Siapin<span className="text-white/95">Aja</span></h1>
              <p className="mt-4 max-w-sm text-base leading-relaxed text-white/85">Semua tools yang kamu butuhkan, siap di satu tempat.</p>
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

            <div className="relative z-10 mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-white/65">Akun siap. Workspace siap.</div>
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
              <span className="ml-auto text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Daftar</span>
            </header>

            <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
              {done ? (
                <div className="text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-soft">
                    <Icon name="check" className="size-6 text-success" />
                  </div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-accent-strong">Pendaftaran berhasil</p>
                  <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Cek email kamu</h2>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-secondary">Kami sudah mengirim email verifikasi. Klik tautan verifikasi di email sebelum masuk ke SiapinAja.</p>
                  <Button className="mt-7" size="lg" onClick={() => router.push("/login")}>Ke Halaman Masuk</Button>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-strong">Daftar akun baru</p>
                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Buat akun SiapinAja</h1>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-secondary">Daftar gratis dan nikmati semua tools untuk membantu pekerjaanmu.</p>
                  </div>

                  <form onSubmit={submit} className="mt-8 space-y-4">
                    <Field label="Nama lengkap">
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Masukkan nama lengkap" required autoFocus />
                    </Field>
                    <Field label="Email">
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Masukkan email aktif" required />
                    </Field>
                    <Field label="Kata sandi">
                      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter" minLength={8} required />
                    </Field>

                    <label className="flex items-start gap-2.5 text-xs text-ink-secondary">
                      <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" required />
                      <span>Saya setuju dengan <Link href={`/terms?returnTo=${encodeURIComponent("/register")}`} className="font-semibold text-accent-strong hover:underline">Syarat & Ketentuan</Link>.</span>
                    </label>
                    <label className="flex items-start gap-2.5 text-xs text-ink-secondary">
                      <input type="checkbox" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" required />
                      <span>Saya telah membaca dan menyetujui <Link href={`/privacy?returnTo=${encodeURIComponent("/register")}`} className="font-semibold text-accent-strong hover:underline">Kebijakan Privasi</Link>.</span>
                    </label>

                    <Turnstile name="turnstileToken" />

                    {error && <p className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-[13px] text-danger">{error}</p>}

                    <Button type="submit" loading={busy} className="mt-2 w-full" size="lg">Daftar Sekarang</Button>
                  </form>

                  <p className="mt-6 text-center text-sm text-ink-secondary">Sudah punya akun? <Link href="/login" className="font-semibold text-accent-strong hover:underline">Masuk</Link></p>
                  <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-faint">Dengan mendaftar, kamu menyetujui syarat dan ketentuan yang berlaku di SiapinAja.</p>
                </>
              )}
            </div>

            <LegalFooter returnTo="/register" />
          </section>
        </div>
      </main>
    </div>
  );
}

// Deployment sync marker: register visual redesign only.
