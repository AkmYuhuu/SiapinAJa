import { notFound, redirect } from "next/navigation";
import { getToolByRoute, getCategory } from "@/lib/registry";
import { requireToolAccess } from "@/lib/tool-access";
import { Breadcrumbs, ToolHeader } from "@/components/tools/tool-shell";
import { EntitlementGate } from "@/components/auth/entitlement-gate";
import { LazyTool } from "@/lib/tool-pages";
import { ToolLocked } from "@/components/tools/tool-locked";
import { getPermissionToolId } from "@/lib/tool-identity";

// Premium tool page (spec §6, §30). The server is the authorization
// authority: it resolves the exact canonical route, looks up the tool, then
// runs requireToolAccess() before anything is rendered. A wrong category for
// a slug (e.g. /tools/freelancer/hpp) is a 404. The client-side
// EntitlementGate remains only as a UX layer.

export default async function ToolPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category: categorySlug, slug } = await params;

  // Exact canonical route lookup - no fallback by slug for permission.
  const tool = getToolByRoute(`/tools/${categorySlug}/${slug}`);
  if (!tool || tool.category !== categorySlug) notFound();

  const permissionToolId = getPermissionToolId(tool);
  const access = await requireToolAccess(permissionToolId);
  if (!access.ok) {
    if (access.reason === "no-session") redirect("/login");
    return <ToolLocked tool={tool} reason={access.reason} />;
  }

  const categoryMeta = getCategory(tool.category);

  return (
    <div>
      <Breadcrumbs tool={tool} categoryName={categoryMeta?.name ?? "Tools"} />
      <ToolHeader tool={tool} />
      <EntitlementGate tool={tool} permissionToolId={permissionToolId}>
        <LazyTool route={tool.route} />
      </EntitlementGate>
    </div>
  );
}
