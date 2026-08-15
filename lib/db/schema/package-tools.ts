import { pgTable, uuid, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { packages } from "./packages";
import { tools } from "./tools";

export const packageTools = pgTable(
  "package_tools",
  {
    packageId: uuid("package_id")
      .notNull()
      .references(() => packages.id),
    toolId: uuid("tool_id")
      .notNull()
      .references(() => tools.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.packageId, t.toolId] }), index("package_tools_tool_id_idx").on(t.toolId)],
);
