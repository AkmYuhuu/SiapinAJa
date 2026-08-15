import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { packages } from "./packages";
import { profiles } from "./profiles";

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    packageId: uuid("package_id")
      .notNull()
      .references(() => packages.id),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    provider: text("provider").notNull(),
    providerReference: text("provider_reference"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("subscriptions_user_id_idx").on(t.userId),
    index("subscriptions_user_id_status_idx").on(t.userId, t.status),
    index("subscriptions_user_id_expires_at_idx").on(t.userId, t.expiresAt),
    index("subscriptions_package_id_idx").on(t.packageId),
  ],
);
