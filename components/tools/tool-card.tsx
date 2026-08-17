import Link from "next/link";
import { ToolDef } from "@/lib/registry";
import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui/card";

const MODEL_LABEL: Record<ToolDef["model"], string> = {
  calculator: "Kalkulator",
  document: "Dokumen",
  workflow: "Workflow",
  media: "Media",
};

const PACK_LABEL: Record<ToolDef["pack"], string> = {
  umkm: "UMKM",
  freelancer: "Freelancer",
  creator: "Creator",
};

export function ToolCard({ tool, compact = false }: { tool: ToolDef; compact?: boolean }) {
  return (
    <Link
      href={tool.route}
      prefetch={false}
      className={`group flex items-start gap-3 rounded-lg border border-border bg-surface transition-colors hover:border-accent/50 hover:bg-accent-soft/40 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <span className={`flex shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-secondary transition-colors group-hover:bg-accent-surface group-hover:text-accent-strong ${compact ? "size-8" : "size-9"}`}>
        <Icon name={tool.icon} className={compact ? "size-4" : "size-[18px]"} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`truncate font-semibold text-ink ${compact ? "text-[13px]" : "text-sm"}`}>{tool.name}</span>
        </span>
        {!compact && <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-secondary">{tool.description}</span>}
        <span className="mt-1.5 flex items-center gap-1.5">
          <Badge tone="neutral">{MODEL_LABEL[tool.model]}</Badge>
          <Badge tone="accent">{PACK_LABEL[tool.pack]}</Badge>
        </span>
      </span>
      <Icon name="chevron" className="mt-1 size-3.5 shrink-0 text-ink-faint" />
    </Link>
  );
}