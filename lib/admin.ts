import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userRoles } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

// Server-side admin authorization. Every admin route/API must call
// requireAdmin(). A hidden menu is not authorization.
//
// Normal admins are stored in user_roles. For a solo-developer deployment,
// ADMIN_EMAILS is a bootstrap allowlist. When a matching user signs in,
// their admin role is also persisted to user_roles so the account is a real
// admin in the application database, not only an environment-variable match.

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

async function bootstrapAdminRole(userId: string): Promise<boolean> {
  try {
    await db
      .insert(userRoles)
      .values({ userId, role: "admin" })
      .onConflictDoNothing();
    return true;
  } catch {
    return false;
  }
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
  if (email && configuredAdminEmails().has(email)) {
    // Persist the bootstrap role. Authorization still succeeds even if the
    // insert fails, because the environment allowlist is itself authoritative.
    await bootstrapAdminRole(user.id);
    return { ok: true };
  }

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
