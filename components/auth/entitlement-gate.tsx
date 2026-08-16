"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { AccessReason } from "@/lib/api/types";
import type { ToolDef } from "@/lib/registry";
import { ToolLocked } from "@/components/tools/tool-locked";
import { Icon } from "@/components/icons";
import { useAuth } from "@/components/auth/auth-provider";

// Client-side UX gate only. The server-side requireToolAccess() guard in the
// tool page remains the security boundary. This component intentionally uses
// the already-loaded AuthProvider state instead of issuing duplicate
// /api/auth/session and /api/account/entitlement requests on every tool.

export function EntitlementGate({
  tool,
  children,
  permissionToolId,
  forceLocked = false,
}: {
  tool: ToolDef;
  children: ReactNode;
  permissionToolId?: string;
  forceLocked?: boolean;
}) {
  const { session, entitlement, loading } = useAuth();
  const [state, setState] = useState<{
    phase: "loading" | "open" | "locked";
    reason?: AccessReason;
  }>({ phase: "loading" });

  useEffect(() => {
    if (loading) {
      setState({ phase: "loading" });
      return;
    }

    if (!session) {
      setState({ phase: "locked", reason: "no-session" });
      return;
    }

    if (forceLocked || tool.status !== "active") {
      setState({ phase: "locked", reason: "disabled" });
      return;
    }

    if (!entitlement || entitlement.status !== "active") {
      setState({ phase: "locked", reason: "expired" });
      return;
    }

    if (new Date(entitlement.expiresAt).getTime() <= Date.now()) {
      setState({ phase: "locked", reason: "expired" });
      return;
    }

    const effectiveToolId = permissionToolId ?? tool.toolId;
    if (!entitlement.tools.includes(effectiveToolId)) {
      setState({ phase: "locked", reason: "not-entitled" });
      return;
    }

    setState({ phase: "open" });
  }, [entitlement, loading, permissionToolId, session, tool.status, tool.toolId, forceLocked]);

  if (state.phase === "loading") {
    return (
      <div className="flex min-h-60 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface py-16">
        <Icon name="refresh" className="size-5 animate-spin text-accent" />
        <p className="text-sm text-ink-secondary">Memeriksa status akun…</p>
      </div>
    );
  }

  if (state.phase === "locked") return <ToolLocked tool={tool} reason={state.reason ?? "error"} />;

  return <>{children}</>;
}
