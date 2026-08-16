import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userRoles } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

// Server-side admin authorization. Every admin route/API must call
// requireAdmin(). A hidden menu is not authorization.
//
// Normal admins are stored in user_roles. For a solo-developer deployment,
// ADMIN_EMAILS can be used as a bootstrap allowlist so the owner does not
// need to manually edit user_roles in Supabase.

export type AdminCheckResult =
  | { ok: true }
  | { ok: false; reason: "no-session" | "forbidden" | "error" };

function configuredAdminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

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

  const email = user.email?.trim().toLowerCase();
  if (email && configuredAdminEmails().has(email)) return { ok: true };

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
