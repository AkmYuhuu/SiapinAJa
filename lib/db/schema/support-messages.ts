import { pgTable, uuid, text, timestamp, index, check } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";
import { supportConversations } from "./support-conversations";

export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => supportConversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    senderType: text("sender_type").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    check("support_messages_sender_type_check", t.senderType.in(["user", "admin"])),
    index("support_messages_conversation_id_idx").on(t.conversationId, t.createdAt),
  ],
);
