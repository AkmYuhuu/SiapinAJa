import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { earlyAccessApplications, profiles, supportConversations, supportMessages } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

const PACKAGE_SLUGS = new Set(["umkm", "freelancer", "creator", "creator-seller"]);

function error(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function GET() {
  const user = await getUser();
  if (!user) return error(401, "NO_SESSION", "Masuk dulu untuk melihat Early Access.");

  const applications = await db
    .select({
      id: earlyAccessApplications.id,
      requestedPackageSlug: earlyAccessApplications.requestedPackageSlug,
      status: earlyAccessApplications.status,
      adminNote: earlyAccessApplications.adminNote,
      createdAt: earlyAccessApplications.createdAt,
      reviewedAt: earlyAccessApplications.reviewedAt,
      conversationId: earlyAccessApplications.conversationId,
    })
    .from(earlyAccessApplications)
    .where(eq(earlyAccessApplications.userId, user.id))
    .orderBy(desc(earlyAccessApplications.createdAt))
    .limit(1);

  return NextResponse.json({ application: applications[0] ?? null });
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return error(401, "NO_SESSION", "Masuk dulu untuk mengikuti Early Access.");

  const body = (await req.json().catch(() => null)) as Record<string, string> | null;
  const requestedPackageSlug = body?.requestedPackageSlug?.trim().toLowerCase() ?? "";
  const fullName = body?.fullName?.trim() ?? "";
  const businessName = body?.businessName?.trim() ?? "";
  const businessType = body?.businessType?.trim() ?? "";
  const productsServices = body?.productsServices?.trim() ?? "";
  const businessAge = body?.businessAge?.trim() ?? "";
  const salesChannels = body?.salesChannels?.trim() ?? "";

  if (!PACKAGE_SLUGS.has(requestedPackageSlug)) return error(400, "BAD_PACKAGE", "Pilih paket Early Access yang ingin dicoba.");
  if ([fullName, businessName, businessType, productsServices, businessAge, salesChannels].some((value) => value.length < 2)) {
    return error(400, "INCOMPLETE", "Lengkapi seluruh informasi usaha terlebih dahulu.");
  }
  if ([fullName, businessName, businessType, productsServices, businessAge, salesChannels].some((value) => value.length > 300)) {
    return error(400, "TOO_LONG", "Beberapa jawaban terlalu panjang.");
  }

  const existing = await db
    .select({ id: earlyAccessApplications.id, status: earlyAccessApplications.status, conversationId: earlyAccessApplications.conversationId })
    .from(earlyAccessApplications)
    .where(and(eq(earlyAccessApplications.userId, user.id), eq(earlyAccessApplications.status, "pending")))
    .limit(1);
  if (existing[0]) return error(409, "ALREADY_PENDING", "Pengajuanmu masih sedang ditinjau.");

  const profile = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  if (!profile[0]) return error(404, "PROFILE_NOT_FOUND", "Profil akun tidak ditemukan.");

  const now = new Date();
  const conversationText = [
    "Pengajuan Early Access baru:",
    `Nama: ${fullName}`,
    `Usaha: ${businessName}`,
    `Jenis usaha: ${businessType}`,
    `Produk/jasa: ${productsServices}`,
    `Lama usaha: ${businessAge}`,
    `Jual lewat: ${salesChannels}`,
    `Paket: ${requestedPackageSlug}`,
  ].join("\n");

  const result = await db.transaction(async (tx) => {
    const conversation = await tx
      .insert(supportConversations)
      .values({
        userId: user.id,
        type: "early_access",
        subject: `Early Access — ${businessName}`,
        status: "open",
        userReadAt: now,
        adminReadAt: null,
      })
      .returning({ id: supportConversations.id });

    const conversationId = conversation[0].id;
    const application = await tx
      .insert(earlyAccessApplications)
      .values({
        conversationId,
        userId: user.id,
        requestedPackageSlug,
        fullName,
        businessName,
        businessType,
        productsServices,
        businessAge,
        salesChannels,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: earlyAccessApplications.id });

    await tx.insert(supportMessages).values({
      conversationId,
      senderId: user.id,
      senderType: "user",
      message: conversationText,
      createdAt: now,
    });

    return { applicationId: application[0].id, conversationId };
  });

  return NextResponse.json({ ok: true, ...result }, { status: 201 });
}
