import { NextResponse } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, supportConversations, supportMessages } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

function error(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return error(401, "NO_SESSION", "Masuk dulu untuk menggunakan bantuan.");

  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId");

  if (conversationId) {
    const conversations = await db
      .select({
        id: supportConversations.id,
        type: supportConversations.type,
        subject: supportConversations.subject,
        status: supportConversations.status,
        createdAt: supportConversations.createdAt,
        updatedAt: supportConversations.updatedAt,
      })
      .from(supportConversations)
      .where(and(eq(supportConversations.id, conversationId), eq(supportConversations.userId, user.id)))
      .limit(1);

    if (!conversations[0]) return error(404, "NOT_FOUND", "Percakapan tidak ditemukan.");

    const messages = await db
      .select({
        id: supportMessages.id,
        senderType: supportMessages.senderType,
        message: supportMessages.message,
        createdAt: supportMessages.createdAt,
      })
      .from(supportMessages)
      .where(eq(supportMessages.conversationId, conversationId))
      .orderBy(asc(supportMessages.createdAt));

    await db
      .update(supportConversations)
      .set({ userReadAt: new Date(), updatedAt: new Date() })
      .where(and(eq(supportConversations.id, conversationId), eq(supportConversations.userId, user.id)));

    return NextResponse.json({ conversation: conversations[0], messages });
  }

  const conversations = await db
    .select({
      id: supportConversations.id,
      type: supportConversations.type,
      subject: supportConversations.subject,
      status: supportConversations.status,
      createdAt: supportConversations.createdAt,
      updatedAt: supportConversations.updatedAt,
    })
    .from(supportConversations)
    .where(eq(supportConversations.userId, user.id))
    .orderBy(desc(supportConversations.updatedAt))
    .limit(20);

  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return error(401, "NO_SESSION", "Masuk dulu untuk menggunakan bantuan.");

  const body = (await req.json().catch(() => null)) as { conversationId?: string; message?: string; subject?: string } | null;
  const message = body?.message?.trim() ?? "";
  if (!message || message.length > 5000) return error(400, "BAD_MESSAGE", "Pesan harus 1-5000 karakter.");

  const now = new Date();
  let conversationId = body?.conversationId?.trim() || "";

  if (conversationId) {
    const existing = await db
      .select({ id: supportConversations.id, status: supportConversations.status })
      .from(supportConversations)
      .where(and(eq(supportConversations.id, conversationId), eq(supportConversations.userId, user.id)))
      .limit(1);
    if (!existing[0]) return error(404, "NOT_FOUND", "Percakapan tidak ditemukan.");
    if (existing[0].status === "closed") return error(409, "CLOSED", "Percakapan ini sudah ditutup.");
  }

  await db.transaction(async (tx) => {
    if (!conversationId) {
      const created = await tx
        .insert(supportConversations)
        .values({ userId: user.id, type: "support", subject: body?.subject?.trim() || "Bantuan SiapinAja", status: "open", userReadAt: now })
        .returning({ id: supportConversations.id });
      conversationId = created[0].id;
    }

    await tx.insert(supportMessages).values({
      conversationId,
      senderId: user.id,
      senderType: "user",
      message,
      createdAt: now,
    });

    await tx
      .update(supportConversations)
      .set({ status: "open", updatedAt: now, userReadAt: now, adminReadAt: null })
      .where(eq(supportConversations.id, conversationId));
  });

  return NextResponse.json({ ok: true, conversationId });
}
