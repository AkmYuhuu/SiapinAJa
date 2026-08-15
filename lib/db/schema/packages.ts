import { pgTable, uuid, text, bigint, integer, timestamp } from "drizzle-orm/pg-core";

export const packages = pgTable("packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  price: bigint("price", { mode: "number" }).notNull().default(0),
  currency: text("currency").notNull().default("IDR"),
  durationDays: integer("duration_days").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
