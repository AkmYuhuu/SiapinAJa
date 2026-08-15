import { pgTable, uuid, text, timestamp, check, sql } from "drizzle-orm/pg-core";

export const tools = pgTable("tools", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("active"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (t) => [
  check("tools_category_check", sql`${t.category} in ('umkm', 'freelancer', 'creator-seller')`),
  check("tools_status_check", sql`${t.status} in ('active', 'inactive')`),
]);
