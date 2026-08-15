import { pgTable, uuid, text, bigint, timestamp } from "drizzle-orm/pg-core";
import { packages } from "./packages";
import { profiles } from "./profiles";

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  packageId: uuid("package_id")
    .notNull()
    .references(() => packages.id),
  provider: text("provider").notNull(),
  providerReference: text("provider_reference").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  currency: text("currency").notNull().default("IDR"),
  status: text("status").notNull().default("pending"),
  paidAt: timestamp("paid_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
