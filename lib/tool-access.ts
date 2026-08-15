import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { packages, packageTools, subscriptions, tools } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

// Server-side tool guard (spec §6-§8). This is the ONLY place that decides
// whether a user may open a premium tool page. The client-side
// EntitlementGate is a UX layer only - it is never the security boundary.
//
// Always fails closed (spec §2, §12): if auth or the database cannot be
// verified, the answer is DENY, never ALLOW.

export type ToolAccessReason = "no-session" | "not-entitled" | "expired" | "disabled" | "error";

export type ToolAccessResult = { ok: true } | { ok: false; reason: ToolAccessReason };

export async function requireToolAccess(toolId: string): Promise<ToolAccessResult> {
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
    const now = new Date();

    const rows = await db
      .select({
        packageStatus: packages.status,
        subscriptionStatus: subscriptions.status,
        expiresAt: subscriptions.expiresAt,
        toolStatus: tools.status,
      })
      .from(subscriptions)
      .innerJoin(packages, eq(subscriptions.packageId, packages.id))
      .innerJoin(packageTools, eq(packageTools.packageId, packages.id))
      .innerJoin(tools, eq(packageTools.toolId, tools.id))
      .where(and(eq(subscriptions.userId, user.id), eq(tools.slug, toolId)));

    // No subscription grants this tool at all.
    if (rows.length === 0) return { ok: false, reason: "not-entitled" };

    // The tool itself is turned off in the catalog.
    if (rows.every((r) => r.toolStatus !== "active")) return { ok: false, reason: "disabled" };

    // Access granted when ANY subscription chain is active and not expired:
    // subscription ACTIVE + package ACTIVE + tool ACTIVE + expires_at > now.
    const granted = rows.some(
      (r) =>
        r.subscriptionStatus === "active" &&
        r.packageStatus === "active" &&
        r.toolStatus === "active" &&
        r.expiresAt.getTime() > now.getTime(),
    );
    if (granted) return { ok: true };

    // The user holds a subscription covering this tool but it is not usable
    // right now (expired, package or subscription not active).
    const hasLiveSubscription = rows.some(
      (r) => r.subscriptionStatus === "active" && r.packageStatus === "active" && r.toolStatus === "active",
    );
    if (hasLiveSubscription) return { ok: false, reason: "expired" };
    return { ok: false, reason: "not-entitled" };
  } catch {
    // cannot verify → deny
    return { ok: false, reason: "error" };
  }
}
