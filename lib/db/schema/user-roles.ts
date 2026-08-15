import { pgTable, uuid, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    role: text("role").notNull().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.role] })],
);
