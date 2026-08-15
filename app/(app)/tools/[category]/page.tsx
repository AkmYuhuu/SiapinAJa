"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { getCategory, toolsByCategory } from "@/lib/registry";
import { ToolCard } from "@/components/tools/tool-card";
import { Icon } from "@/components/icons";

export default function CategoryHubPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: categoryId } = use(params);
  const category = getCategory(String(categoryId));
  if (!category) notFound();
  const tools = toolsByCategory(category.id);

  return (
    <div className="space-y-8">
      <header className="flex items-start gap-4">
        <span className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
          <Icon name={category.icon} className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{category.name}</h1>
          <p className="mt-1 text-sm text-ink-secondary">{category.subtitle}</p>
          <p className="mt-0.5 text-[12px] text-ink-faint">{category.personality}</p>
        </div>
      </header>

      {category.groups.map((group) => {
        const groupTools = group.toolIds
          .map((id) => tools.find((t) => t.toolId === id))
          .filter((t): t is NonNullable<typeof t> => Boolean(t));
        if (groupTools.length === 0) return null;
        return (
          <section key={group.label}>
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">{group.label}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {groupTools.map((tool) => (
                <ToolCard key={tool.toolId} tool={tool} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}