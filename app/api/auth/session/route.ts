import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Session } from "@/lib/api/types";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(null);
  }

  const session: Session = {
    userId: user.id,
    name: user.user_metadata?.name || user.email || "",
    email: user.email || "",
  };
  return NextResponse.json(session);
}
