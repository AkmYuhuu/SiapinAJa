import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { earlyAccessApplications, packages, profiles, supportConversations, supportMessages, subscriptions } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

function error(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "no-session" ? 401 : 403, "FORBIDDEN", "Akses admin diperlukan.");

  const applications = await db
    .select({
      id: earlyAccessApplications.id,
      conversationId: earlyAccessApplications.conversationId,
      userId: earlyAccessApplications.userId,
      requestedPackageSlug: earlyAccessApplications.requestedPackageSlug,
      fullName: earlyAccessApplications.fullName,
      businessName: earlyAccessApplications.businessName,
      businessType: earlyAccessApplications.businessType,
      productsServices: earlyAccessApplications.productsServices,
      businessAge: earlyAccessApplications.businessAge,
      salesChannels: earlyAccessApplications.salesChannels,
      status: earlyAccessApplications.status,
      adminNote: earlyAccessApplications.adminNote,
      createdAt: earlyAccessApplications.createdAt,
      reviewedAt: earlyAccessApplications.reviewedAt,
      userName: profiles.displayName,
    })
    .from(earlyAccessApplications)
    .innerJoin(profiles, eq(earlyAccessApplications.userId, profiles.id))
    .where(inArray(earlyAccessApplications.status, ["pending", "needs_info"]))
    .orderBy(desc(earlyAccessApplications.createdAt))
    .limit(100);

  return NextResponse.json({ applications });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "no-session" ? 401 : 403, "FORBIDDEN", "Akses admin diperlukan.");

  const body = (await req.json().catch(() => null)) as { applicationId?: string; action?: string; adminNote?: string } | null;
  const applicationId = body?.applicationId?.trim() ?? "";
  const action = body?.action ?? "";
  const adminNote = body?.adminNote?.trim() || null;
  if (!applicationId || !["approve", "reject", "needs_info"].includes(action)) return error(400, "BAD_REQUEST", "Data review tidak valid.");

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const adminUserId = data.user?.id;
  if (!adminUserId) return error(401, "NO_SESSION", "Sesi admin tidak ditemukan.");

  const rows = await db
    .select({
      id: earlyAccessApplications.id,
      userId: earlyAccessApplications.userId,
      conversationId: earlyAccessApplications.conversationId,
      requestedPackageSlug: earlyAccessApplications.requestedPackageSlug,
      status: earlyAccessApplications.status,
    })
    .from(earlyAccessApplications)
    .where(eq(earlyAccessApplications.id, applicationId))
    .limit(1);
  const application = rows[0];
  if (!application) return error(404, "NOT_FOUND", "Pengajuan tidak ditemukan.");
  if (!["pending", "needs_info"].includes(application.status)) return error(409, "ALREADY_REVIEWED", "Pengajuan ini sudah diproses.");

  const now = new Date();

  if (action === "needs_info") {
    const text = adminNote ? `Admin membutuhkan informasi tambahan:\n\n${adminNote}` : "Admin membutuhkan informasi tambahan. Silakan balas di chat ini.";
    await db.transaction(async (tx) => {
      await tx.update(earlyAccessApplications).set({ status: "needs_info", adminNote, reviewedBy: adminUserId, reviewedAt: now, updatedAt: now }).where(eq(earlyAccessApplications.id, applicationId));
      await tx.insert(supportMessages).values({ conversationId: application.conversationId, senderId: adminUserId, senderType: "admin", message: text, createdAt: now });
      await tx.update(supportConversations).set({ status: "needs_info", updatedAt: now, adminReadAt: now, userReadAt: null }).where(eq(supportConversations.id, application.conversationId));
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    const text = adminNote ? `Pengajuan Early Access belum dapat disetujui.\n\nCatatan: ${adminNote}` : "Pengajuan Early Access belum dapat disetujui saat ini.";
    await db.transaction(async (tx) => {
      await tx.update(earlyAccessApplications).set({ status: "rejected", adminNote, reviewedBy: adminUserId, reviewedAt: now, updatedAt: now }).where(eq(earlyAccessApplications.id, applicationId));
      await tx.insert(supportMessages).values({ conversationId: application.conversationId, senderId: adminUserId, senderType: "admin", message: text, createdAt: now });
      await tx.update(supportConversations).set({ status: "resolved", updatedAt: now, adminReadAt: now, userReadAt: null }).where(eq(supportConversations.id, application.conversationId));
    });
    return NextResponse.json({ ok: true });
  }

  const packageRows = await db
    .select({ id: packages.id, slug: packages.slug, durationDays: packages.durationDays, status: packages.status })
    .from(packages)
    .where(and(eq(packages.slug, application.requestedPackageSlug), eq(packages.status, "active")))
    .limit(1);
  const pkg = packageRows[0];
  if (!pkg) return error(404, "PACKAGE_NOT_FOUND", "Paket Early Access tidak tersedia.");

  await db.transaction(async (tx) => {
    const active = await tx
      .select({ id: subscriptions.id, expiresAt: subscriptions.expiresAt })
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, application.userId), eq(subscriptions.packageId, pkg.id), eq(subscriptions.status, "active")))
      .limit(1);

    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (active[0]) {
      const later = active[0].expiresAt.getTime() > expiresAt.getTime() ? active[0].expiresAt : expiresAt;
      await tx.update(subscriptions).set({ status: "active", expiresAt: later, updatedAt: now, provider: "early_access", providerReference: `early-access:${application.id}` }).where(eq(subscriptions.id, active[0].id));
    } else {
      await tx.insert(subscriptions).values({
        userId: application.userId,
        packageId: pkg.id,
        status: "active",
        startedAt: now,
        expiresAt,
        provider: "early_access",
        providerReference: `early-access:${application.id}`,
      });
    }

    await tx.update(earlyAccessApplications).set({ status: "approved", adminNote, reviewedBy: adminUserId, reviewedAt: now, updatedAt: now }).where(eq(earlyAccessApplications.id, applicationId));
    await tx.insert(supportMessages).values({ conversationId: application.conversationId, senderId: adminUserId, senderType: "admin", message: `Pengajuan Early Access kamu disetujui. Paket ${pkg.name ?? pkg.slug} aktif gratis selama 30 hari. Selamat mencoba dan jangan ragu mengirim feedback lewat Bantuan SiapinAja.`, createdAt: now });
    await tx.update(supportConversations).set({ status: "resolved", updatedAt: now, adminReadAt: now, userReadAt: null }).where(eq(supportConversations.id, application.conversationId));
  });

  return NextResponse.json({ ok: true, accessDays: 30 });
}
