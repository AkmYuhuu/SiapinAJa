import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Session } from "@/lib/api/types";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;

  if (!email || !password) {
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
