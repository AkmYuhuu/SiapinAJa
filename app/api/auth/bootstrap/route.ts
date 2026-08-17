import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveEntitlement } from "@/lib/entitlement";
import type { Session } from "@/lib/api/types";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ session: null, entitlement: null });
  }

  const session: Session = {
    userId: user.id,
    name: user.user_metadata?.name || user.email || "",
    email: user.email || "",
  };

  try {
    const entitlement = await resolveEntitlement(user.id);
    return NextResponse.json({ session, entitlement });
  } catch (err) {
    console.error("Auth bootstrap entitlement error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Status akses tidak dapat dimuat." } },
      { status: 500 },
    );
  }
}
