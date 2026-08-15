import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

export const adminActions = pgTable("admin_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminUserId: uuid("admin_user_id")
    .notNull()
    .references(() => profiles.id),
  targetUserId: uuid("target_user_id").references(() => profiles.id),
  action: text("action").notNull(),
  reason: text("reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
