import { pgTable, uuid, text, integer, timestamp, check, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { packages } from "./packages";
import { profiles } from "./profiles";
import { subscriptions } from "./subscriptions";

export const redemptionCodes = pgTable(
  "redemption_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codeHash: text("code_hash").notNull().unique(),
    codePrefix: text("code_prefix").notNull(),
    packageId: uuid("package_id")
      .notNull()
      .references(() => packages.id),
    durationDays: integer("duration_days").notNull(),
    status: text("status").notNull().default("active"),
    redeemedBy: uuid("redeemed_by").references(() => profiles.id),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true, mode: "date" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    check("redemption_codes_duration_positive_check", sql`${t.durationDays} > 0`),
    check("redemption_codes_status_check", sql`${t.status} in ('active', 'redeemed', 'revoked')`),
    index("redemption_codes_status_idx").on(t.status),
    index("redemption_codes_package_id_idx").on(t.packageId),
  ],
);
