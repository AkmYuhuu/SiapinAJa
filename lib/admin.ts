import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userRoles } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

// Server-side admin authorization (spec §17-§18). Every admin route/API must
// call requireAdmin() and deny with 403 when it fails. A hidden menu is NOT
// authorization - users can still call endpoints directly.

export type AdminCheckResult =
  | { ok: true }
  | { ok: false; reason: "no-session" | "forbidden" | "error" };

export async function requireAdmin(): Promise<AdminCheckResult> {
  let user;
  try {
    const supabase = await createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    user = currentUser;
  } catch {
    return { ok: false, reason: "error" };
  }

  if (!user) return { ok: false, reason: "no-session" };

  try {
    const rows = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(and(eq(userRoles.userId, user.id), eq(userRoles.role, "admin")))
      .limit(1);
    return rows.length > 0 ? { ok: true } : { ok: false, reason: "forbidden" };
  } catch {
    return { ok: false, reason: "error" };
  }
}
