import { notFound, redirect } from "next/navigation";
import { getTool, getToolByRoute, getCategory } from "@/lib/registry";
import { requireToolAccess } from "@/lib/tool-access";
import { Breadcrumbs, ToolHeader } from "@/components/tools/tool-shell";
import { Icon } from "@/components/icons";
import { LazyTool } from "@/lib/tool-pages";

export default async function ToolPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category: categorySlug, slug } = await params;
  const tool = getToolByRoute(`/tools/${categorySlug}/${slug}`) ?? getTool(String(slug));
  if (!tool) notFound();

  // The registry identifies the tool; the server decides whether the current
  // authenticated user may open it. Never render the tool before this check.
  const access = await requireToolAccess(tool.toolId);
  if (!access.ok) {
    redirect(access.reason === "no-session" ? "/login" : "/pricing");
  }

  const category = getCategory(tool.category);

  return (
    <div>
      <Breadcrumbs tool={tool} categoryName={category?.name ?? "Tools"} />
      <ToolHeader tool={tool} />
      <LazyTool route={tool.route} />
    </div>
  );
}

// Fallback while a tool page loads
export function ToolLoading() {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface">
      <Icon name="refresh" className="size-5 animate-spin text-accent" />
      <p className="text-sm text-ink-secondary">Menyiapkan tool…</p>
    </div>
  );
}
