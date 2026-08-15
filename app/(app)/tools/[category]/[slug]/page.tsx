"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { getTool, getToolByRoute, getCategory } from "@/lib/registry";
import { EntitlementGate } from "@/components/auth/entitlement-gate";
import { Breadcrumbs, ToolHeader } from "@/components/tools/tool-shell";
import { Icon } from "@/components/icons";
import { LazyTool } from "@/lib/tool-pages";

export default function ToolPage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category: categorySlug, slug } = use(params);
  const tool = getToolByRoute(`/tools/${categorySlug}/${slug}`) ?? getTool(String(slug));
  if (!tool) notFound();
  const category = getCategory(tool.category);

  return (
    <div>
      <Breadcrumbs tool={tool} categoryName={category?.name ?? "Tools"} />
      <ToolHeader tool={tool} />
      <EntitlementGate tool={tool}>
        <LazyTool route={tool.route} />
      </EntitlementGate>
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