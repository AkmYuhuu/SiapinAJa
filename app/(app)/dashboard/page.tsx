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
import { LegalFooter } from "@/components/legal/legal-footer";

export default function DashboardPage() {
  return <Suspense fallback={null}><DashboardContent /></Suspense>;
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
    <div className="space-y-10 pb-10">
      <header className="pt-1">
        <h1 className="text-[29px] font-extrabold tracking-[-0.035em] text-ink sm:text-[31px]">Siapin apa hari ini?</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-6 text-ink-secondary">Buka tool, isi datanya, dan hasilnya langsung keluar. Semua tetap sederhana, cepat, dan dikerjakan di browser.</p>
      </header>

      <div className="rounded-2xl border border-[#e9e4db] bg-white p-1.5 shadow-[0_6px_24px_rgba(43,40,35,0.05)]">
        <SearchTools />
      </div>

      {searchResults && (searchResults.toolHits.length === 0 && searchResults.projectHits.length === 0 ? (
        <EmptyState icon={<Icon name="search" className="size-5" />} title="Tidak ada hasil" description={`Tidak ditemukan tools atau proyek untuk "${q}". Coba kata kunci lain.`} />
      ) : (
        <section className="space-y-5">
          {searchResults.toolHits.length > 0 && <div><h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint">Tools ({searchResults.toolHits.length})</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{searchResults.toolHits.map((t) => <ToolCard key={t.toolId} tool={t} />)}</div></div>}
          {searchResults.projectHits.length > 0 && <div><h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint">Proyek ({searchResults.projectHits.length})</h2><div className="overflow-hidden rounded-2xl border border-[#e9e4db] bg-white shadow-[0_4px_18px_rgba(43,40,35,0.04)]"><table className="w-full text-sm"><tbody>{searchResults.projectHits.map((p) => { const tool = getTool(p.toolId); return <tr key={p.id} className="border-b border-[#eeeae2] last:border-0 hover:bg-[#fcfaf6]"><td className="px-5 py-4">{tool && <span className="mr-2 inline-flex size-7 items-center justify-center rounded-lg bg-[#f8f6f1]"><Icon name={tool.icon} className="size-3.5 text-ink-secondary" /></span>}<span className="font-semibold text-ink">{p.name}</span></td><td className="hidden px-5 py-4 text-[12px] text-ink-faint sm:table-cell">{tool?.name ?? p.toolId}</td><td className="hidden px-5 py-4 text-right text-[12px] text-ink-faint md:table-cell">{timeAgo(p.updatedAt)}</td><td className="px-5 py-4 text-right">{tool && <Link href={tool.route} className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-accent-strong hover:bg-accent-soft">Buka</Link>}</td></tr>; })}</tbody></table></div></div>}
        </section>
      ))}

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div><h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-faint">Kategori</h2><p className="mt-1 text-[13px] text-ink-secondary">Pilih area kerja yang paling sesuai dengan kebutuhanmu.</p></div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link key={c.id} href={`/tools/${c.id}`} className="group rounded-2xl border border-[#e8e3da] bg-white p-5 shadow-[0_5px_22px_rgba(43,40,35,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#efd0b6] hover:shadow-[0_12px_28px_rgba(43,40,35,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[#fff0e5] text-accent-strong ring-1 ring-[#f7dfcc]"><Icon name={c.icon} className="size-[21px]" /></span>
                <span className="rounded-full bg-[#fbf8f3] px-2.5 py-1 text-[10px] font-bold text-ink-faint">{toolsByCategory(c.id).length} tools</span>
              </div>
              <h3 className="mt-5 text-[17px] font-bold tracking-tight text-ink">{c.name}</h3>
              <p className="mt-1.5 min-h-[40px] text-[12px] leading-5 text-ink-secondary">{c.callout}</p>
              <p className="mt-5 inline-flex items-center gap-1 text-[12px] font-bold text-accent-strong">Buka kategori<Icon name="chevron" className="size-3.5 transition-transform group-hover:translate-x-0.5" /></p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div><h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-faint">Terakhir Digunakan</h2><p className="mt-1 text-[13px] text-ink-secondary">Lanjutkan tool yang baru saja kamu pakai.</p></div>
        </div>
        {lastTools.length === 0 ? <EmptyState compact icon={<Icon name="history" className="size-5" />} title="Belum ada tool yang dibuka" description="Tool yang kamu buka akan muncul di sini." /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{lastTools.map((id) => { const tool = getToolByRoute(id); return tool ? <div key={id} className="overflow-hidden rounded-2xl border border-[#e8e3da] bg-white shadow-[0_5px_22px_rgba(43,40,35,0.04)]"><ToolCard tool={tool} /></div> : null; })}</div>}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-faint">Proyek Saya</h2><p className="mt-1 text-[13px] text-ink-secondary">Project yang tersimpan di perangkat ini.</p></div><Link href="/projects" className="rounded-lg px-2.5 py-1.5 text-[12px] font-bold text-accent-strong hover:bg-accent-soft">Lihat semua</Link></div>
        {recent.length === 0 ? <div className="rounded-2xl border border-dashed border-[#d9d3c7] bg-white p-8"><EmptyState compact icon={<Icon name="folder" className="size-5" />} title="Belum ada proyek" description="Proyek yang kamu simpan dari tools akan tersimpan di perangkat ini." actionLabel="Jelajahi tools" onAction={() => router.push("/tools/umkm")} /></div> : <div className="overflow-hidden rounded-2xl border border-[#e8e3da] bg-white shadow-[0_5px_22px_rgba(43,40,35,0.04)]"><table className="w-full text-sm"><tbody>{recent.map((p) => { const tool = getTool(p.toolId); return <tr key={p.id} className="border-b border-[#eeeae2] last:border-0 hover:bg-[#fcfaf6]"><td className="px-5 py-4">{tool && <span className="mr-2 inline-flex size-7 items-center justify-center rounded-lg bg-[#f8f6f1]"><Icon name={tool.icon} className="size-3.5 text-ink-secondary" /></span>}<span className="font-semibold text-ink">{p.name}</span></td><td className="hidden px-5 py-4 text-[12px] text-ink-faint sm:table-cell">{tool?.name ?? p.toolId}</td><td className="hidden px-5 py-4 text-right text-[12px] text-ink-faint md:table-cell">{timeAgo(p.updatedAt)}</td><td className="px-5 py-4 text-right">{tool && <Link href={tool.route} className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-accent-strong hover:bg-accent-soft">Buka</Link>}</td></tr>; })}</tbody></table></div>}
      </section>

      <section className="rounded-2xl border border-[#eadfd3] bg-gradient-to-r from-white via-white to-[#fff8f2] p-5 shadow-[0_5px_22px_rgba(43,40,35,0.04)]"><p className="text-[13px] text-ink-secondary"><strong className="text-ink">{TOOLS.length} tools</strong> tersedia di SiapinAja untuk membantu menghitung harga, membuat dokumen, dan menyiapkan materi jualan.</p></section>

      <LegalFooter returnTo="/dashboard" />
    </div>
  );
}
