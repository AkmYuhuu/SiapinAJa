import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { validateEmailAddress } from "@/lib/auth/email-validation";

type RegisterBody = {
  email?: string;
  password?: string;
  name?: string;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
};

export async function POST(req: Request) {
  const limiter = rateLimit(`register:${clientIp(req)}`, 10);
  if (!limiter.ok) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Terlalu banyak percobaan. Coba lagi nanti." } },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((limiter.retryAfterMs ?? 60_000) / 1000)) },
      },
    );
  }

  const body = (await req.json().catch(() => null)) as RegisterBody | null;
  const rawEmail = body?.email ?? "";
  const password = body?.password;
  const name = body?.name?.trim();

  if (typeof password !== "string" || !name) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Nama, email, dan kata sandi wajib diisi." } },
      { status: 400 },
    );
  }

  const emailCheck = await validateEmailAddress(rawEmail);
  if (!emailCheck.ok) {
    return NextResponse.json(
      { error: { code: "INVALID_EMAIL", message: emailCheck.message } },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Kata sandi minimal 8 karakter." } },
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
  const acceptedAt = new Date().toISOString();
  const { data, error } = await supabase.auth.signUp({
    email: emailCheck.email,
    password,
    options: {
      data: {
        name,
        terms_accepted_at: acceptedAt,
        privacy_accepted_at: acceptedAt,
      },
    },
  });

  if (error) {
    const lower = error.message.toLowerCase();
    const message = lower.includes("already")
      ? "Email sudah terdaftar."
      : error.message;
    return NextResponse.json({ error: { code: "BAD_REQUEST", message } }, { status: 400 });
  }

  return NextResponse.json({ ok: true, needsEmailConfirm: !data.session }, { status: 201 });
}
