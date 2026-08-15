import Link from "next/link";
import { CATEGORIES, toolsByCategory } from "@/lib/registry";
import { ToolCard } from "@/components/tools/tool-card";
import { Icon } from "@/components/icons";

export default function ToolsHubPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Semua Tools</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          27 tools untuk UMKM, freelancer, dan creator - hitung, buat dokumen, dan siapkan materi jualan.
        </p>
      </header>

      {CATEGORIES.map((category) => {
        const tools = toolsByCategory(category.id);
        return (
          <section key={category.id}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">{category.name}</h2>
              <Link href={`/tools/${category.id}`} className="text-[13px] font-medium text-accent-strong hover:underline">
                Lihat kategori
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {tools.map((tool) => (
                <ToolCard key={tool.toolId} tool={tool} />
              ))}
            </div>
          </section>
        );
      })}

      <section className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
          <Icon name="tools" className="size-5" />
        </span>
        <p className="text-[13px] text-ink-secondary">
          Semua project tersimpan lokal di perangkatmu - <Link href="/projects" className="font-medium text-accent-strong hover:underline">lihat Proyek Saya</Link>.
        </p>
      </section>
    </div>
  );
}