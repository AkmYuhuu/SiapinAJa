import { pgTable, uuid, text, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profiles } from "./profiles";

export const supportConversations = pgTable(
  "support_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("support"),
    subject: text("subject"),
    status: text("status").notNull().default("open"),
    userReadAt: timestamp("user_read_at", { withTimezone: true, mode: "date" }),
    adminReadAt: timestamp("admin_read_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    check("support_conversations_type_check", sql`${t.type} in ('support','early_access')`),
    check("support_conversations_status_check", sql`${t.status} in ('open','needs_info','resolved','closed')`),
    index("support_conversations_user_id_idx").on(t.userId),
    index("support_conversations_status_idx").on(t.status),
    index("support_conversations_updated_at_idx").on(t.updatedAt),
  ],
);
