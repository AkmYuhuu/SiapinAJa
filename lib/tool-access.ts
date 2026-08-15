import { createClient } from "@/lib/supabase/server";
import { resolveAllowedTools } from "@/lib/entitlement";

export type ToolAccessReason = "no-session" | "denied" | "error";

export type ToolAccessResult =
  | { ok: true }
  | { ok: false; reason: ToolAccessReason };

/**
 * Server-side tool permission check.
 *
 * The URL and client-side EntitlementGate are UX only. This function is the
 * authoritative page-level check and fails closed when the session or DB
 * cannot be verified.
 */
export async function requireToolAccess(toolId: string): Promise<ToolAccessResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return { ok: false, reason: "no-session" };

    const allowedTools = await resolveAllowedTools(user.id, [toolId]);
    return allowedTools.has(toolId)
      ? { ok: true }
      : { ok: false, reason: "denied" };
  } catch {
    // Never fail open when the database or auth service is unavailable.
    return { ok: false, reason: "error" };
  }
}
