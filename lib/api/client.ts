// API client - the ONLY place the app talks to the backend.
// Frontend never decides entitlement itself; it asks this layer.
// V1 backend = Supabase (Auth + PostgreSQL + RLS) served through Next.js
// API routes. Server is always the source of truth; premium tools stay
// locked whenever the server check cannot succeed.

import type { AuthBootstrap, Entitlement, Session, AccessState, VerifyResult } from "./types";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await res.json().catch(() => null)
    : null;
  const serverMessage =
    payload && typeof payload === "object" && "error" in payload && payload.error && typeof payload.error === "object" && "message" in payload.error
      ? String(payload.error.message ?? "")
      : "";

  if (!res.ok) {
    if (res.status === 401) throw new ApiError(serverMessage || "Email atau kata sandi salah.", 401);
    if (res.status === 403) throw new ApiError(serverMessage || "Akses ditolak untuk paket ini.", 403);
    if (res.status === 429) throw new ApiError(serverMessage || "Terlalu banyak permintaan. Coba lagi sebentar lagi.", 429);
    if (res.status >= 500) throw new ApiError(serverMessage || "Layanan sedang bermasalah. Coba lagi nanti.", res.status);
    throw new ApiError(serverMessage || "Permintaan tidak dapat diproses.", res.status);
  }

  return payload as T;
}

export const api = {
  async bootstrap(): Promise<AuthBootstrap> {
    return http<AuthBootstrap>("/api/auth/bootstrap", { cache: "no-store" });
  },
  async getSession(): Promise<Session | null> {
    return http<Session | null>("/api/auth/session", { cache: "no-store" });
  },
  async getEntitlement(): Promise<Entitlement | null> {
    return http<Entitlement | null>("/api/account/entitlement", { cache: "no-store" });
  },
  async login(email: string, password: string, consent?: { termsAccepted: boolean; privacyAccepted: boolean }): Promise<Session> {
    return http<Session>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, ...consent }),
    });
  },
  async logout(): Promise<void> {
    return http("/api/auth/logout", { method: "POST" });
  },
  async verifyAccess(tool: { toolId: string; status: string }): Promise<VerifyResult> {
    try {
      const bootstrap = await api.bootstrap();
      return { access: evaluate(bootstrap.session, bootstrap.entitlement, tool), session: bootstrap.session, entitlement: bootstrap.entitlement };
    } catch {
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      return { access: { ok: false, reason: offline ? "offline" : "error" }, session: null, entitlement: null };
    }
  },
};

function evaluate(session: Session | null, entitlement: Entitlement | null, tool: { toolId: string; status: string }): AccessState {
  if (!session) return { ok: false, reason: "no-session" };
  if (!entitlement || entitlement.status !== "active") return { ok: false, reason: "expired" };
  if (new Date(entitlement.expiresAt).getTime() <= Date.now()) return { ok: false, reason: "expired" };
  if (tool.status !== "active") return { ok: false, reason: "disabled" };
  if (!entitlement.tools.includes(tool.toolId)) return { ok: false, reason: "not-entitled" };
  return { ok: true };
}

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}
