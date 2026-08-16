import { NextResponse } from "next/server";
import { lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { redemptionCodes } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;

  if (!expected || authorization !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deleted = await db
      .delete(redemptionCodes)
      .where(lt(redemptionCodes.expiresAt, new Date()))
      .returning({ id: redemptionCodes.id });

    return NextResponse.json({ ok: true, deleted: deleted.length });
  } catch (error) {
    console.error("Redemption code cleanup failed", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
