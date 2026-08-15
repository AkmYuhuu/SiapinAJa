// API client - the ONLY place the app talks to the backend.
// Frontend never decides entitlement itself; it asks this layer.
// V1 backend = Supabase (Auth + PostgreSQL + RLS) served through Next.js
// API routes. Server is always the source of truth; premium tools stay
// locked whenever the server check cannot succeed.

import type { Entitlement, Session, AccessState, VerifyResult } from "./types";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (res.status === 401) throw new ApiError("Session berakhir. Silakan masuk lagi.", 401);
  if (res.status === 403) throw new ApiError("Akses ditolak untuk paket ini.", 403);
  if (res.status === 429) throw new ApiError("Terlalu banyak permintaan. Coba lagi sebentar lagi.", 429);
  if (!res.ok && res.status >= 500) {
    throw new ApiError("Layanan sedang bermasalah. Coba lagi nanti.", res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  async getSession(): Promise<Session | null> {
    return http<Session | null>("/api/auth/session");
  },

  async getEntitlement(): Promise<Entitlement | null> {
    return http<Entitlement | null>("/api/account/entitlement");
  },

  async login(email: string, password: string): Promise<Session> {
    return http<Session>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  },

  async logout(): Promise<void> {
    return http("/api/auth/logout", { method: "POST" });
  },

  /**
   * One combined verify: session + entitlement in one call. If anything
   * cannot be verified (offline, error, no session), premium access is off
   * (spec §4.4: offline means premium tools stay locked).
   */
  async verifyAccess(pack: string): Promise<VerifyResult> {
    try {
      const [session, entitlement] = await Promise.all([
        http<Session | null>("/api/auth/session"),
        http<Entitlement | null>("/api/account/entitlement"),
      ]);
      return { access: evaluate(session, entitlement, pack), session, entitlement };
    } catch {
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      return {
        access: { ok: false, reason: offline ? "offline" : "error" },
        session: null,
        entitlement: null,
      };
    }
  },
};

function evaluate(
  session: Session | null,
  entitlement: Entitlement | null,
  pack: string,
): AccessState {
  if (!session) return { ok: false, reason: "no-session" };
  if (!entitlement || entitlement.status !== "active") {
    return { ok: false, reason: "expired" };
  }
  const now = Date.now();
  if (new Date(entitlement.expiresAt).getTime() <= now) {
    return { ok: false, reason: "expired" };
  }
  if (!entitlement.packs.includes(pack) && !entitlement.packs.includes("all")) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true };
}

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}
