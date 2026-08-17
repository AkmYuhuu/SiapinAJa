import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { packages, redemptionCodes, subscriptions } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

function hashCode(code: string) {
  return createHash("sha256").update(code.trim().toUpperCase(), "utf8").digest("hex");
}

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) return errorResponse(401, "NO_SESSION", "Masuk terlebih dahulu untuk memakai kode aktivasi.");

  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  const code = body?.code?.trim().toUpperCase();

  if (!code || code.length < 12 || code.length > 80) {
    return errorResponse(400, "BAD_REQUEST", "Masukkan kode aktivasi yang valid.");
  }

  const codeHash = hashCode(code);
  const now = new Date();

  try {
    const result = await db.transaction(async (tx) => {
      const rows = await tx
        .select({
          id: redemptionCodes.id,
          packageId: redemptionCodes.packageId,
          durationDays: redemptionCodes.durationDays,
          status: redemptionCodes.status,
          expiresAt: redemptionCodes.expiresAt,
          packageSlug: packages.slug,
          packageName: packages.name,
          packageStatus: packages.status,
        })
        .from(redemptionCodes)
        .innerJoin(packages, eq(redemptionCodes.packageId, packages.id))
        .where(and(eq(redemptionCodes.codeHash, codeHash), eq(redemptionCodes.status, "active"), gt(redemptionCodes.expiresAt, now)))
        .limit(1)
        .for("update");

      const redemption = rows[0];
      if (!redemption || redemption.packageStatus !== "active") throw new Error("INVALID_OR_USED_CODE");

      const existing = await tx
        .select({ id: subscriptions.id, expiresAt: subscriptions.expiresAt })
        .from(subscriptions)
        .where(and(eq(subscriptions.userId, userId), eq(subscriptions.packageId, redemption.packageId), eq(subscriptions.status, "active"), gt(subscriptions.expiresAt, now)))
        .orderBy(desc(subscriptions.expiresAt))
        .limit(1);

      const startedAt = existing[0]?.expiresAt && existing[0].expiresAt > now ? existing[0].expiresAt : now;
      const expiresAt = new Date(startedAt.getTime() + redemption.durationDays * 24 * 60 * 60 * 1000);
      let subscriptionId: string;

      if (existing[0]) {
        const [updated] = await tx
          .update(subscriptions)
          .set({ status: "active", expiresAt, updatedAt: now, provider: "manual_code", providerReference: `redeem:${redemption.id}` })
          .where(eq(subscriptions.id, existing[0].id))
          .returning({ id: subscriptions.id, expiresAt: subscriptions.expiresAt });
        subscriptionId = updated.id;
      } else {
        const [subscription] = await tx
          .insert(subscriptions)
          .values({ userId, packageId: redemption.packageId, status: "active", startedAt, expiresAt, provider: "manual_code", providerReference: `redeem:${redemption.id}` })
          .returning({ id: subscriptions.id, expiresAt: subscriptions.expiresAt });
        subscriptionId = subscription.id;
      }

      const claimed = await tx
        .update(redemptionCodes)
        .set({ status: "redeemed", redeemedBy: userId, redeemedAt: now, subscriptionId })
        .where(and(eq(redemptionCodes.id, redemption.id), eq(redemptionCodes.status, "active")))
        .returning({ id: redemptionCodes.id });

      if (!claimed[0]) throw new Error("INVALID_OR_USED_CODE");

      return { packageName: redemption.packageName, packageSlug: redemption.packageSlug, expiresAt };
    });

    return NextResponse.json({ ok: true, message: `${result.packageName} berhasil diaktifkan.`, package: result.packageSlug, expiresAt: result.expiresAt.toISOString() });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_OR_USED_CODE") return errorResponse(400, "INVALID_OR_USED_CODE", "Kode tidak valid, sudah dipakai, sudah expired, atau paketnya tidak aktif.");
    console.error("Redeem code failed", error);
    return errorResponse(500, "REDEEM_FAILED", "Kode belum dapat diproses. Coba lagi nanti.");
  }
}
