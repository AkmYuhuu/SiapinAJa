export interface Session {
  userId: string;
  name: string;
  email: string;
}

export interface Entitlement {
  packs: string[];
  status: "active" | "expired";
  expiresAt: string;
  packages: Array<{ slug: string; status: string; expiresAt: string }>;
  tools: string[];
}

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

export type AccessReason = "no-session" | "expired" | "offline" | "error";

export type AccessState = { ok: true } | { ok: false; reason: AccessReason };

export interface VerifyResult {
  access: AccessState;
  session: Session | null;
  entitlement: Entitlement | null;
}
