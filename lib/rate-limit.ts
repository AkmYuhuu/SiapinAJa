import "server-only";

// Minimal shared in-memory rate limiter (spec §34). One strategy used by
// every sensitive endpoint (login, register, webhook, admin) instead of
// per-endpoint one-off limiters. Memory is per-deployment instance, so this
// is a first protection layer on top of the host's own protections, not a
// distributed limiter.

interface Bucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const buckets = new Map<string, Bucket>();

function cleanup(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterMs?: number;
}

/** Sliding-window-per-key limiter. Returns ok:false when the limit is hit. */
export function rateLimit(key: string, limit: number, windowMs = WINDOW_MS): RateLimitResult {
  const now = Date.now();
  cleanup(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { ok: true };
}

/** Best-effort client IP for rate limiting. Never trust it for auth. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}
