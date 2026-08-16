import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminActions, packages, redemptionCodes } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function hashCode(code: string) {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

function makeCode(packageSlug: string) {
  const prefix = packageSlug.slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, "X");
  const random = randomBytes(8).toString("hex").toUpperCase();
  return `SIAJ-${prefix}-${random.slice(0, 4)}-${random.slice(4, 8)}-${random.slice(8, 12)}-${random.slice(12)}`;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return jsonError(admin.reason === "no-session" ? 401 : 403, "FORBIDDEN", "Akses admin diperlukan.");

  const [codes, packageRows] = await Promise.all([
    db
      .select({
        id: redemptionCodes.id,
        codePrefix: redemptionCodes.codePrefix,
        status: redemptionCodes.status,
        durationDays: redemptionCodes.durationDays,
        packageSlug: packages.slug,
        packageName: packages.name,
        redeemedAt: redemptionCodes.redeemedAt,
        createdAt: redemptionCodes.createdAt,
        expiresAt: redemptionCodes.expiresAt,
      })
      .from(redemptionCodes)
      .innerJoin(packages, eq(redemptionCodes.packageId, packages.id))
      .orderBy(desc(redemptionCodes.createdAt))
      .limit(100),
    db
      .select({ slug: packages.slug, name: packages.name, durationDays: packages.durationDays })
      .from(packages)
      .where(eq(packages.status, "active"))
      .orderBy(packages.name),
  ]);

  return NextResponse.json({ codes, packages: packageRows });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return jsonError(admin.reason === "no-session" ? 401 : 403, "FORBIDDEN", "Akses admin diperlukan.");

  const body = (await req.json().catch(() => null)) as { packageSlug?: string; quantity?: number } | null;
  const packageSlug = body?.packageSlug?.trim().toLowerCase();
  const quantity = Number(body?.quantity ?? 1);

  if (!packageSlug || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
    return jsonError(400, "BAD_REQUEST", "Paket wajib dipilih dan jumlah kode harus 1-50.");
  }

  const packageRows = await db
    .select({
      id: packages.id,
      slug: packages.slug,
      name: packages.name,
      durationDays: packages.durationDays,
    })
    .from(packages)
    .where(and(eq(packages.slug, packageSlug), eq(packages.status, "active")))
    .limit(1);

  const pkg = packageRows[0];
  if (!pkg) return jsonError(404, "PACKAGE_NOT_FOUND", "Paket aktif tidak ditemukan.");

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const adminUserId = userData.user?.id;
  if (!adminUserId) return jsonError(401, "NO_SESSION", "Sesi login tidak ditemukan.");

  const generated: string[] = [];
  const now = new Date();
  const expiresAt = new Date(now.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);

  await db.transaction(async (tx) => {
    for (let i = 0; i < quantity; i++) {
      const code = makeCode(pkg.slug);
      await tx.insert(redemptionCodes).values({
        codeHash: hashCode(code),
        codePrefix: code.slice(0, 13),
        packageId: pkg.id,
        durationDays: pkg.durationDays,
        status: "active",
        expiresAt,
      });
      generated.push(code);
    }

    await tx.insert(adminActions).values({
      adminUserId,
      action: "generate_redemption_codes",
      reason: "Manual payment activation",
      metadata: { packageSlug: pkg.slug, quantity, expiresAt: expiresAt.toISOString() },
    });
  });

  return NextResponse.json(
    {
      ok: true,
      package: { slug: pkg.slug, name: pkg.name, durationDays: pkg.durationDays },
      expiresAt: expiresAt.toISOString(),
      codes: generated,
    },
    { status: 201 },
  );
}
