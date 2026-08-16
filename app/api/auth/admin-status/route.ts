import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const result = await requireAdmin();

  if (result.reason === "no-session") {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }

  if (!result.ok) {
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }

  return NextResponse.json({ isAdmin: true }, { status: 200 });
}
