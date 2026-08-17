import { NextResponse } from "next/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { earlyAccessApplications, profiles, supportConversations, supportMessages } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/admin";

function error(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "no-session" ? 401 : 403, "FORBIDDEN", "Akses admin diperlukan.");

  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");

  if (conversationId) {
    const conversation = await db
      .select({
        id: supportConversations.id,
        userId: supportConversations.userId,
        type: supportConversations.type,
        subject: supportConversations.subject,
        status: supportConversations.status,
        createdAt: supportConversations.createdAt,
        updatedAt: supportConversations.updatedAt,
        userName: profiles.displayName,
      })
      .from(supportConversations)
      .innerJoin(profiles, eq(supportConversations.userId, profiles.id))
      .where(eq(supportConversations.id, conversationId))
      .limit(1);

    if (!conversation[0]) return error(404, "NOT_FOUND", "Percakapan tidak ditemukan.");

    const [messages, applications] = await Promise.all([
      db
        .select({ id: supportMessages.id, senderType: supportMessages.senderType, message: supportMessages.message, createdAt: supportMessages.createdAt })
        .from(supportMessages)
        .where(eq(supportMessages.conversationId, conversationId))
        .orderBy(asc(supportMessages.createdAt)),
      conversation[0].type === "early_access"
        ? db
            .select({
              id: earlyAccessApplications.id,
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
            })
            .from(earlyAccessApplications)
            .where(eq(earlyAccessApplications.conversationId, conversationId))
            .limit(1)
        : Promise.resolve([]),
    ]);

    await db.update(supportConversations).set({ adminReadAt: new Date() }).where(eq(supportConversations.id, conversationId));

    return NextResponse.json({ conversation: conversation[0], messages, application: applications[0] ?? null });
  }

  const conversations = await db
    .select({
      id: supportConversations.id,
      userId: supportConversations.userId,
      type: supportConversations.type,
      subject: supportConversations.subject,
      status: supportConversations.status,
      updatedAt: supportConversations.updatedAt,
      userReadAt: supportConversations.userReadAt,
      adminReadAt: supportConversations.adminReadAt,
      userName: profiles.displayName,
    })
    .from(supportConversations)
    .innerJoin(profiles, eq(supportConversations.userId, profiles.id))
    .where(inArray(supportConversations.status, ["open", "needs_info"]))
    .orderBy(desc(supportConversations.updatedAt))
    .limit(100);

  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return error(admin.reason === "no-session" ? 401 : 403, "FORBIDDEN", "Akses admin diperlukan.");
  const body = (await req.json().catch(() => null)) as { conversationId?: string; message?: string } | null;
  const conversationId = body?.conversationId?.trim() ?? "";
  const message = body?.message?.trim() ?? "";
  if (!conversationId || !message || message.length > 5000) return error(400, "BAD_REQUEST", "Percakapan dan pesan wajib diisi.");

  const supabaseUser = await import("@/lib/supabase/server").then(({ createClient }) => createClient());
  const { data } = await supabaseUser.auth.getUser();
  if (!data.user) return error(401, "NO_SESSION", "Sesi tidak ditemukan.");

  const existing = await db
    .select({ id: supportConversations.id, status: supportConversations.status })
    .from(supportConversations)
    .where(eq(supportConversations.id, conversationId))
    .limit(1);
  if (!existing[0]) return error(404, "NOT_FOUND", "Percakapan tidak ditemukan.");
  if (existing[0].status === "closed") return error(409, "CLOSED", "Percakapan sudah ditutup.");

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(supportMessages).values({
      conversationId,
      senderId: data.user.id,
      senderType: "admin",
      message,
      createdAt: now,
    });
    await tx.update(supportConversations).set({ status: "open", updatedAt: now, adminReadAt: now, userReadAt: null }).where(eq(supportConversations.id, conversationId));
  });

  return NextResponse.json({ ok: true });
}
