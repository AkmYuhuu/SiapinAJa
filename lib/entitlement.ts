import "server-only";

import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "./db/index";
import { packages, packageTools, subscriptions, tools } from "./db/schema";

// Centralized entitlement resolution (Backend_v3 §2.21/§55).
// V1 has no `entitlements` table: effective access = subscriptions +
// packages + package_tools + tools. Server is the only source of truth.
//
// Every query enforces the full chain (spec §8-§10): subscription ACTIVE +
// not expired + package ACTIVE + tool ACTIVE. Any failure = no access.

export interface ResolvedEntitlement {
  packs: string[];
  status: "active" | "expired";
  expiresAt: string;
  packages: Array<{ slug: string; status: string; expiresAt: string }>;
  tools: string[];
}

export async function resolveEntitlement(userId: string): Promise<ResolvedEntitlement> {
  const now = new Date();

  const rows = await db
    .select({
      packageSlug: packages.slug,
      expiresAt: subscriptions.expiresAt,
      status: subscriptions.status,
      toolSlug: tools.slug,
    })
    .from(subscriptions)
    .innerJoin(packages, eq(subscriptions.packageId, packages.id))
    .innerJoin(packageTools, eq(packageTools.packageId, packages.id))
    .innerJoin(tools, eq(packageTools.toolId, tools.id))
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        gt(subscriptions.expiresAt, now),
        eq(packages.status, "active"),
        eq(tools.status, "active"),
      ),
    );

  const packageMap = new Map<string, { slug: string; status: string; expiresAt: Date }>();
  const toolSet = new Set<string>();
  for (const row of rows) {
    toolSet.add(row.toolSlug);
    const existing = packageMap.get(row.packageSlug);
    if (!existing || row.expiresAt.getTime() > existing.expiresAt.getTime()) {
      packageMap.set(row.packageSlug, { slug: row.packageSlug, status: row.status, expiresAt: row.expiresAt });
    }
  }

  const expiresAt =
    rows.length > 0
      ? new Date(Math.max(...[...packageMap.values()].map((p) => p.expiresAt.getTime()))).toISOString()
      : now.toISOString();

  return {
    packs: [...packageMap.values()].map((p) => p.slug),
    status: rows.length > 0 ? "active" : "expired",
    expiresAt,
    packages: [...packageMap.values()].map((p) => ({
      slug: p.slug,
      status: "active",
      expiresAt: p.expiresAt.toISOString(),
    })),
    tools: [...toolSet],
  };
}

/** Single canonical check: does the user have an active subscription to a package? */
export async function hasActivePackage(userId: string, packageSlug: string): Promise<boolean> {
  const now = new Date();
  const rows = await db
    .select({ expiresAt: subscriptions.expiresAt })
    .from(subscriptions)
    .innerJoin(packages, eq(subscriptions.packageId, packages.id))
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(packages.slug, packageSlug),
        eq(subscriptions.status, "active"),
        eq(packages.status, "active"),
        gt(subscriptions.expiresAt, now),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** Fetch the tool slugs a user may access (used to gate server-side operations). */
export async function resolveAllowedTools(userId: string, toolSlugs?: string[]): Promise<Set<string>> {
  const rows = await db
    .select({ toolSlug: tools.slug })
    .from(subscriptions)
    .innerJoin(packages, eq(subscriptions.packageId, packages.id))
    .innerJoin(packageTools, eq(packageTools.packageId, packages.id))
    .innerJoin(tools, eq(packageTools.toolId, tools.id))
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        eq(packages.status, "active"),
        eq(tools.status, "active"),
        gt(subscriptions.expiresAt, new Date()),
        toolSlugs ? inArray(tools.slug, toolSlugs) : undefined,
      ),
    );
  return new Set(rows.map((r) => r.toolSlug));
}
