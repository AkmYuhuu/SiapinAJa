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

  const entitlement = await resolveEntitlement(user.id);
  return NextResponse.json(entitlement);
}
