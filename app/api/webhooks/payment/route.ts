import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { payments, subscriptions, packages, webhookEvents } from "@/lib/db/schema";

// Payment webhook (Backend_v3 §21-29, §2.24).
// Provider: SociaBuzz-style webhook. All mutations run inside a transaction
// so payment = PAID and subscription = ACTIVE are always consistent.
//
// Adjust signature verification to the provider's documented scheme. The
// endpoint never trusts user_id/amount/status sent by a client - it only
// acts on the verified provider event.

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

export async function POST(req: Request) {
  const valid = await verifySignature(req);
  if (!valid) {
    return NextResponse.json({ error: { code: "WEBHOOK_INVALID", message: "Signature tidak valid." } }, { status: 401 });
  }

  const payload = (await req.json().catch(() => null)) as WebhookPayload | null;
  if (!payload?.event_id || !payload.event_type) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Payload tidak lengkap." } }, { status: 400 });
  }

  const provider = "sociabuzz";

  // Idempotency: unique (provider, event_id). Already processed -> 200.
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
      await tx.insert(webhookEvents).values({
        provider,
        eventId: payload.event_id,
        eventType: payload.event_type,
        payload,
        status: "processing",
        receivedAt: new Date(),
      });

      if (payload.event_type !== "payment.success") {
        await tx.update(webhookEvents).set({ status: "ignored", processedAt: new Date() }).where(eq(webhookEvents.eventId, payload.event_id));
        return;
      }

      const pkg = await tx.select().from(packages).where(eq(packages.slug, payload.package_slug ?? "")).limit(1);
      if (pkg.length === 0 || payload.amount !== pkg[0].price) {
        await tx.update(webhookEvents).set({ status: "failed", errorMessage: "amount/package mismatch", processedAt: new Date() }).where(eq(webhookEvents.eventId, payload.event_id));
        throw new Error("PAYMENT_INVALID");
      }

      // Resolve the paying user by email (client never sends a trusted user_id).
      // Parameterized query against auth.users through the same pool.
      const rows = await db.execute<{ id: string }>(sql`select id from auth.users where email = ${payload.user_email}`);
      if (rows.rows.length === 0) throw new Error("USER_NOT_FOUND");
      const userId = rows.rows[0].id;

      const now = new Date();
      const paidAt = now;
      await tx.insert(payments).values({
        userId,
        packageId: pkg[0].id,
        provider,
        providerReference: payload.provider_reference,
        amount: payload.amount,
        currency: pkg[0].currency,
        status: "paid",
        paidAt,
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

      await tx.update(webhookEvents).set({ status: "processed", processedAt: now }).where(eq(webhookEvents.eventId, payload.event_id));
    });
  } catch (err) {
    console.error("Payment webhook error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Gagal memproses pembayaran." } }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
