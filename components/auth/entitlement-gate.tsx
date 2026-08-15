"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api } from "@/lib/api/client";
import type { AccessReason } from "@/lib/api/types";
import type { ToolDef } from "@/lib/registry";
import { ToolLocked } from "@/components/tools/tool-locked";
import { Icon } from "@/components/icons";

// Client-side UX gate (spec §11). This is NOT the security layer - the
// server-side requireToolAccess() guard is the authority. This component only
// provides loading state, refresh behavior and error messaging.

export function EntitlementGate({
  tool,
  children,
  forceLocked = false,
}: {
  tool: ToolDef;
  children: ReactNode;
  forceLocked?: boolean;
}) {
  const [state, setState] = useState<{ phase: "loading" | "open" | "locked"; reason?: AccessReason }>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      setState({ phase: "loading" });
      const res = await api.verifyAccess({ toolId: tool.toolId, status: tool.status });
      if (cancelled) return;
      if (res.access.ok && !forceLocked) setState({ phase: "open" });
      else
        setState({
          phase: "locked",
          reason: res.access.ok === false ? res.access.reason : "expired",
        });
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [tool.toolId, tool.status, forceLocked]);

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
