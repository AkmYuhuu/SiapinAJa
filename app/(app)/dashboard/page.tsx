"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES, toolsByCategory, TOOLS, getTool, getToolByRoute, searchTools } from "@/lib/registry";
import { listProjects } from "@/lib/projects";
import type { Project } from "@/lib/projects";
import { getToolHistory } from "@/lib/local-prefs";
import { SearchTools } from "@/components/tools/search-tools";
import { ToolCard } from "@/components/tools/tool-card";
import { Icon } from "@/components/icons";
import { EmptyState } from "@/components/ui/empty";
import { timeAgo } from "@/lib/format";

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") ?? "";
  const [projects, setProjects] = useState<Project[]>([]);
  const lastTools = useMemo(() => getToolHistory().slice(0, 6), []);

  useEffect(() => {
    listProjects().then(setProjects).catch(() => setProjects([]));
  }, []);

  const recent = projects.slice(0, 5);

  const searchResults = useMemo(() => {
    if (!q) return null;
    const query = q.toLowerCase();
    const toolHits = searchTools(q).filter((t) => t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query));
    const projectHits = projects.filter((p) => {
      const tool = getTool(p.toolId);
      return p.name.toLowerCase().includes(query) || (tool?.name ?? "").toLowerCase().includes(query);
    });
    return { toolHits, projectHits };
  }, [q, projects]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Siapin apa hari ini?</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Buka tool, isi datanya, dan hasilnya langsung keluar - semua di browser.
        </p>
      </header>

      <SearchTools />

      {searchResults &&
        (searchResults.toolHits.length === 0 && searchResults.projectHits.length === 0 ? (
          <EmptyState
            icon={<Icon name="search" className="size-5" />}
            title="Tidak ada hasil"
            description={`Tidak ditemukan tools atau proyek untuk "${q}". Coba kata kunci lain.`}
          />
        ) : (
          <section className="space-y-4">
            {searchResults.toolHits.length > 0 && (
              <div>
                <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">
                  Tools ({searchResults.toolHits.length})
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {searchResults.toolHits.map((t) => (
                    <ToolCard key={t.toolId} tool={t} />
                  ))}
                </div>
              </div>
            )}
            {searchResults.projectHits.length > 0 && (
              <div>
                <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">
                  Proyek ({searchResults.projectHits.length})
                </h2>
                <div className="overflow-hidden rounded-lg border border-border bg-surface">
                  <table className="w-full text-sm">
                    <tbody>
                      {searchResults.projectHits.map((p) => {
                        const tool = getTool(p.toolId);
                        return (
                          <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-muted/60">
                            <td className="px-4 py-3">
                              {tool && <Icon name={tool.icon} className="mr-2 inline size-4 text-ink-faint" />}
                              <span className="font-medium text-ink">{p.name}</span>
                            </td>
                            <td className="hidden px-4 py-3 text-[13px] text-ink-faint sm:table-cell">{tool?.name ?? p.toolId}</td>
                            <td className="hidden px-4 py-3 text-right text-[13px] text-ink-faint md:table-cell">{timeAgo(p.updatedAt)}</td>
                            <td className="px-4 py-3 text-right">
                              {tool && (
                                <Link href={tool.route} className="text-[13px] font-medium text-accent-strong hover:underline">
                                  Buka
                                </Link>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        ))}

      {/* Category shortcuts */}
      <section>
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Kategori</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/tools/${c.id}`}
              className="group rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-accent-soft/40"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
                <Icon name={c.icon} className="size-5" />
              </span>
              <h3 className="mt-3 font-semibold text-ink">{c.name}</h3>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-secondary">{c.callout}</p>
              <p className="mt-2 text-[12px] font-medium text-accent-strong">
                {toolsByCategory(c.id).length} tools
                <Icon name="chevron" className="ml-1 inline size-3" />
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recently used tools */}
      <section>
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Terakhir Digunakan</h2>
        {lastTools.length === 0 ? (
          <EmptyState
            compact
            icon={<Icon name="history" className="size-5" />}
            title="Belum ada tool yang dibuka"
            description="Tool yang kamu buka akan muncul di sini."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {lastTools.map((id) => {
              const tool = getToolByRoute(id);
              return tool ? <ToolCard key={id} tool={tool} /> : null;
            })}
          </div>
        )}
      </section>

      {/* My projects */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Proyek Saya</h2>
          <Link href="/projects" className="text-[13px] font-medium text-accent-strong hover:underline">
            Lihat semua
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            compact
            icon={<Icon name="folder" className="size-5" />}
            title="Belum ada proyek"
            description="Proyek yang kamu simpan dari tools akan tersimpan di perangkat ini."
            actionLabel="Jelajahi tools"
            onAction={() => router.push("/tools/umkm")}
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <tbody>
                {recent.map((p) => {
                  const tool = getTool(p.toolId);
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-muted/60">
                      <td className="px-4 py-3">
                        {tool && <Icon name={tool.icon} className="mr-2 inline size-4 text-ink-faint" />}
                        <span className="font-medium text-ink">{p.name}</span>
                      </td>
                      <td className="hidden px-4 py-3 text-[13px] text-ink-faint sm:table-cell">{tool?.name ?? p.toolId}</td>
                      <td className="hidden px-4 py-3 text-right text-[13px] text-ink-faint md:table-cell">{timeAgo(p.updatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {tool && (
                          <Link href={tool.route} className="text-[13px] font-medium text-accent-strong hover:underline">
                            Buka
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* All tools count strip */}
      <section className="rounded-lg border border-border bg-surface p-4">
        <p className="text-[13px] text-ink-secondary">
          <strong className="text-ink">{TOOLS.length} tools</strong> tersedia di SiapinAja - hitung harga, buat dokumen, dan siapkan materi jualan.
        </p>
      </section>
    </div>
  );
}