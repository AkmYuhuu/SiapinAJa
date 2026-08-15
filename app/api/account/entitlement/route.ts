import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveEntitlement } from "@/lib/entitlement";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(null);
  }

  try {
    const entitlement = await resolveEntitlement(user.id);
    return NextResponse.json(entitlement);
  } catch (err) {
    // Fail closed: if entitlement cannot be verified, do not fabricate access.
    console.error("Entitlement resolution error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Status akses tidak dapat dimuat." } },
      { status: 500 },
    );
  }
}
