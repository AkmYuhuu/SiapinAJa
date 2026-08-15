"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/ui/toast";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
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
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-accent">
              <Icon name="tools" className="size-4 text-white" />
            </span>
            <span className="text-base font-bold tracking-tight text-ink">
              Siapin<span className="text-accent-strong">Aja</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 items-start gap-10 px-4 py-10 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-6 lg:p-8">
          <h1 className="text-xl font-bold text-ink">Masuk</h1>
          <p className="mt-1 text-sm text-ink-secondary">Lanjutkan pekerjaanmu dari mana pun terakhir berhenti.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kamu@email.com" required autoFocus />
            </Field>
            <Field label="Kata sandi">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </Field>
            {error && <p className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-danger">{error}</p>}
            <Button type="submit" loading={busy} className="w-full" size="lg">
              Masuk
            </Button>
          </form>

          <p className="mt-6 text-center text-[13px] text-ink-secondary">
            Belum punya akun?{" "}
            <Link href="/register" className="font-semibold text-accent-strong hover:underline">
              Daftar
            </Link>
          </p>
        </div>

        <div className="hidden rounded-lg border border-dashed border-border-strong bg-surface/60 p-8 lg:block">
          <Icon name="lock" className="size-6 text-ink-faint" />
          <h2 className="mt-4 text-lg font-bold text-ink">Kenapa harus masuk?</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
            Untuk membuka tools premium, status akunmu diverifikasi ke server. Nggak ada cara lain - URL
            saja bukan izin akses.
          </p>
          <ul className="mt-5 space-y-2.5 text-sm text-ink-secondary">
            {["Paket aktif bisa dipakai penuh", "Status kedaluwarsa menampilkan tampilan terkunci", "Draft dan project tetap aman di perangkatmu"].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <Icon name="check" className="mt-0.5 size-4 shrink-0 text-success" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}