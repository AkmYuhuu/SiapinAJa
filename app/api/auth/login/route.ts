import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import type { Session } from "@/lib/api/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;

  if (!email || !EMAIL_RE.test(email) || typeof password !== "string" || password.length === 0) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Email dan kata sandi wajib diisi." } },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Email atau kata sandi salah." } },
      { status: 401 },
    );
  }

  const session: Session = {
    userId: data.user.id,
    name: data.user.user_metadata?.name || email,
    email,
  };
  return NextResponse.json(session);
}
