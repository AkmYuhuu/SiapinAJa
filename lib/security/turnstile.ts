import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type VerificationResponse = {
  success?: boolean;
  hostname?: string;
  "error-codes"?: string[];
};

export async function verifyTurnstile(token: string | undefined, req: Request): Promise<{ ok: true } | { ok: false; reason: "missing" | "invalid" | "not_configured" }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, reason: "not_configured" };
  if (!token) return { ok: false, reason: "missing" };

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);

  const remoteIp = req.headers.get("CF-Connecting-IP") ?? req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });

    if (!response.ok) return { ok: false, reason: "invalid" };
    const result = (await response.json()) as VerificationResponse;
    return result.success === true ? { ok: true } : { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
