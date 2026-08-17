import { pgTable, uuid, text, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profiles } from "./profiles";
import { supportConversations } from "./support-conversations";

export const earlyAccessApplications = pgTable(
  "early_access_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull().unique().references(() => supportConversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    requestedPackageSlug: text("requested_package_slug").notNull(),
    fullName: text("full_name").notNull(),
    businessName: text("business_name").notNull(),
    businessType: text("business_type").notNull(),
    productsServices: text("products_services").notNull(),
    businessAge: text("business_age").notNull(),
    salesChannels: text("sales_channels").notNull(),
    status: text("status").notNull().default("pending"),
    adminNote: text("admin_note"),
    reviewedBy: uuid("reviewed_by").references(() => profiles.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    check("early_access_status_check", sql`${t.status} in ('pending','needs_info','approved','rejected')`),
    check("early_access_package_check", sql`${t.requestedPackageSlug} in ('umkm','freelancer','creator','creator-seller')`),
    index("early_access_applications_status_idx").on(t.status),
    index("early_access_applications_user_id_idx").on(t.userId),
  ],
);
