import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import type { Session } from "@/lib/api/types";
import { verifyTurnstile } from "@/lib/security/turnstile";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LoginBody = {
  email?: string;
  password?: string;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
  captchaToken?: string;
};

export async function POST(req: Request) {
  const limiter = rateLimit(`login:${clientIp(req)}`, 10);
  if (!limiter.ok) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Terlalu banyak percobaan. Coba lagi nanti." } },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((limiter.retryAfterMs ?? 60_000) / 1000)) },
      },
    );
  }

  const body = (await req.json().catch(() => null)) as LoginBody | null;
  const captcha = await verifyTurnstile(body?.captchaToken, req);
  if (!captcha.ok) {
    const status = captcha.reason === "not_configured" ? 503 : 400;
    const message = captcha.reason === "not_configured"
      ? "Proteksi anti-bot belum dikonfigurasi. Silakan coba lagi nanti."
      : "Verifikasi anti-bot gagal. Silakan selesaikan verifikasi lalu coba lagi.";
    return NextResponse.json({ error: { code: "CAPTCHA_REQUIRED", message } }, { status });
  }

  const email = body?.email?.trim();
  const password = body?.password;

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: { code: "INVALID_EMAIL", message: "Format email tidak valid." } },
      { status: 400 },
    );
  }
  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Kata sandi wajib diisi." } },
      { status: 400 },
    );
  }
  if (body?.termsAccepted !== true || body?.privacyAccepted !== true) {
    return NextResponse.json(
      { error: { code: "CONSENT_REQUIRED", message: "Kamu wajib menyetujui Syarat & Ketentuan dan Kebijakan Privasi." } },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    const lower = (error?.message ?? "").toLowerCase();
    if (lower.includes("email not confirmed") || lower.includes("email belum dikonfirmasi")) {
      return NextResponse.json(
        { error: { code: "EMAIL_NOT_CONFIRMED", message: "Email belum diverifikasi. Cek inbox untuk tautan verifikasi." } },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: { code: "INVALID_CREDENTIALS", message: "Email atau kata sandi salah." } },
      { status: 401 },
    );
  }

  const acceptedAt = new Date().toISOString();
  await supabase.auth.updateUser({
    data: {
      ...data.user.user_metadata,
      terms_accepted_at: acceptedAt,
      privacy_accepted_at: acceptedAt,
    },
  });

  const session: Session = {
    userId: data.user.id,
    name: data.user.user_metadata?.name || email,
    email,
  };
  return NextResponse.json(session);
}
