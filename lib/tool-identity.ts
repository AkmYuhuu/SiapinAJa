import type { ToolDef } from "@/lib/registry";

// Some categories intentionally expose tools with the same public slug/name
// (for example Invoice and Kwitansi), but their permissions must remain
// isolated. Keep the public registry unchanged and derive a globally unique
// backend permission identity only for those duplicated tool IDs.
const CATEGORY_SCOPED_TOOL_IDS = new Set(["invoice", "receipt"]);

export function getPermissionToolId(tool: Pick<ToolDef, "category" | "toolId">): string {
  if (tool.category === "freelancer" && CATEGORY_SCOPED_TOOL_IDS.has(tool.toolId)) {
    return `${tool.toolId}-freelancer`;
  }
  return tool.toolId;
}
