import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { payments, subscriptions, packages, webhookEvents } from "@/lib/db/schema";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Payment webhook (Backend_v3 §21-29, §2.24).
// Provider: SociaBuzz-style webhook. All mutations run inside a transaction
// so payment = PAID and subscription = ACTIVE are always consistent.
//
// The endpoint never trusts user_id/amount/status sent by a client - it only
// acts on the verified provider event. Signature verification is required
// (fail closed: no secret configured => webhook is rejected).
//
// Idempotency is (provider, event_id): duplicates return a success no-op.
// On retry of a previously failed event the existing row is re-processed
// instead of being re-inserted (unique index safe).

interface WebhookPayload {
  event_id: string;
  event_type: string;
  provider_reference: string;
  user_email?: string;
  package_slug?: string;
  amount?: number;
}

async function verifySignature(req: Request): Promise<boolean> {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) return false;
  const signature = req.headers.get("x-webhook-signature");
  if (!signature) return false;
  const raw = await req.clone().text();
  const crypto = await import("crypto");
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  return signature === expected;
}

function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === "23505";
}

function isStr(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export async function POST(req: Request) {
  const limiter = rateLimit(`webhook:${clientIp(req)}`, 60);
  if (!limiter.ok) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Terlalu banyak permintaan." } },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((limiter.retryAfterMs ?? 60_000) / 1000)) },
      },
    );
  }

  const valid = await verifySignature(req);
  if (!valid) {
    return NextResponse.json({ error: { code: "WEBHOOK_INVALID", message: "Signature tidak valid." } }, { status: 401 });
  }

  const payload = (await req.json().catch(() => null)) as WebhookPayload | null;
  if (!payload || !isStr(payload.event_id) || !isStr(payload.event_type)) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Payload tidak lengkap." } }, { status: 400 });
  }

  const provider = "sociabuzz";

  // Idempotency: unique (provider, event_id). Already processed -> success no-op.
  const existing = await db
    .select({ id: webhookEvents.id, status: webhookEvents.status })
    .from(webhookEvents)
    .where(and(eq(webhookEvents.provider, provider), eq(webhookEvents.eventId, payload.event_id)))
    .limit(1);

  if (existing.length > 0 && existing[0].status === "processed") {
    return NextResponse.json({ ok: true, alreadyProcessed: true });
  }

  try {
    await db.transaction(async (tx) => {
      let eventId: string | null = null;
      if (existing.length > 0) {
        eventId = existing[0].id;
        await tx
          .update(webhookEvents)
          .set({ status: "processing", payload, receivedAt: new Date() })
          .where(eq(webhookEvents.id, existing[0].id));
      } else {
        const inserted = await tx
          .insert(webhookEvents)
          .values({
            provider,
            eventId: payload.event_id,
            eventType: payload.event_type,
            payload,
            status: "processing",
            receivedAt: new Date(),
          })
          .returning({ id: webhookEvents.id });
        eventId = inserted[0]?.id ?? null;
      }

      if (payload.event_type !== "payment.success") {
        if (eventId) {
          await tx
            .update(webhookEvents)
            .set({ status: "ignored", processedAt: new Date() })
            .where(eq(webhookEvents.id, eventId));
        }
        return;
      }

      if (!isStr(payload.package_slug) || !isNum(payload.amount) || !isStr(payload.user_email)) {
        throw new Error("PAYMENT_INVALID:missing payment fields");
      }

      const pkg = await tx.select().from(packages).where(eq(packages.slug, payload.package_slug)).limit(1);
      if (pkg.length === 0 || pkg[0].status !== "active" || payload.amount !== pkg[0].price) {
        throw new Error("PAYMENT_INVALID:amount/package mismatch");
      }

      // Resolve the paying user by email (client never sends a trusted user_id).
      // Parameterized query against auth.users through the same pool.
      const rows = await db.execute<{ id: string }>(sql`select id from auth.users where email = ${payload.user_email}`);
      if (rows.rows.length === 0) throw new Error("USER_NOT_FOUND");
      const userId = rows.rows[0].id;

      const now = new Date();
      await tx.insert(payments).values({
        userId,
        packageId: pkg[0].id,
        provider,
        providerReference: payload.provider_reference,
        amount: payload.amount,
        currency: pkg[0].currency,
        status: "paid",
        paidAt: now,
      });

      // Renewal rule (§2.14/§26): extend from existing expires_at if still active.
      const activeSub = await tx
        .select()
        .from(subscriptions)
        .where(and(eq(subscriptions.userId, userId), eq(subscriptions.packageId, pkg[0].id), eq(subscriptions.status, "active")))
        .limit(1);

      const base =
        activeSub.length > 0 && activeSub[0].expiresAt.getTime() > now.getTime() ? activeSub[0].expiresAt : now;

      const expiresAt = new Date(base.getTime() + pkg[0].durationDays * 24 * 60 * 60 * 1000);

      if (activeSub.length > 0) {
        await tx
          .update(subscriptions)
          .set({ status: "active", expiresAt, updatedAt: now })
          .where(eq(subscriptions.id, activeSub[0].id));
      } else {
        await tx.insert(subscriptions).values({
          userId,
          packageId: pkg[0].id,
          status: "active",
          startedAt: now,
          expiresAt,
          provider,
          providerReference: payload.provider_reference,
        });
      }

      if (eventId) {
        await tx
          .update(webhookEvents)
          .set({ status: "processed", processedAt: now })
          .where(eq(webhookEvents.id, eventId));
      }
    });
  } catch (err) {
    // Lost a race to another request for the same event -> treat as no-op.
    if (isUniqueViolation(err)) {
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }
    // Record the failure outside the rolled-back transaction so a retry can
    // be detected, then return an error (spec §20). A failed webhook never
    // activates a subscription.
    try {
      await db
        .update(webhookEvents)
        .set({ status: "failed", errorMessage: err instanceof Error ? err.message : "processing error", processedAt: new Date() })
        .where(and(eq(webhookEvents.provider, provider), eq(webhookEvents.eventId, payload.event_id)));
    } catch {
      // failure record is best-effort
    }
    console.error("Payment webhook error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Gagal memproses pembayaran." } }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
