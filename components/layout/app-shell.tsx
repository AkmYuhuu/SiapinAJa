"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { SidebarContent } from "./sidebar";
import { SupportWidget } from "@/components/support/support-widget";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/icons";
import { getTool, getToolByRoute, getCategory, CATEGORIES, searchTools } from "@/lib/registry";
import { listProjects } from "@/lib/projects";
import type { Project } from "@/lib/projects";

function pageTitleForPath(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "tools" && parts[1]) {
    const cat = getCategory(parts[1]);
    if (parts.length === 2) return cat?.name ?? "Tools";
    const tool = getToolByRoute(`/tools/${parts[1]}/${parts[2]}`);
    if (tool) return tool.name;
    return "Tools";
  }
  const map: Record<string, string> = {
    dashboard: "Beranda",
    projects: "Proyek Saya",
    favorites: "Favorit",
    history: "Riwayat",
    pricing: "Paket & Billing",
    account: "Akun",
    settings: "Pengaturan",
    help: "Pusat Bantuan",
  };
  if (parts.length === 1 && parts[0] === "tools") return "Semua Tools";
  return parts.length ? (map[parts[parts.length - 1]] ?? "SiapinAja") : "SiapinAja";
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuth();

  const title = pageTitleForPath(pathname);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listProjects().then(setAllProjects).catch(() => setAllProjects([]));
  }, []);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return null;
    const toolHits = searchTools(q).filter(
      (t) => t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query),
    );
    const projectHits = allProjects.filter((p) => {
      const tool = getTool(p.toolId);
      return p.name.toLowerCase().includes(query) || (tool?.name ?? "").toLowerCase().includes(query);
    });
    return { toolHits, projectHits };
  }, [q, allProjects]);

  const closeSoon = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => setOpen(false), 120);
  };

  const goDashboard = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    router.push(q.trim() ? `/dashboard?q=${encodeURIComponent(q.trim())}` : "/dashboard");
  };

  const isDashboard = pathname === "/dashboard";

  return (
    <div className="min-h-screen">
      <aside className="app-sidebar fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-border bg-surface lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="app-sidebar absolute inset-y-0 left-0 w-64 bg-surface shadow-[8px_0_32px_rgba(43,40,35,0.15)]">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="app-shell-content lg:pl-60">
        <header className="app-topbar print-hide sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-bg/90 px-4 backdrop-blur lg:px-6">
          <button className="flex size-8 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-muted lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Buka menu">
            <svg className="size-5" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <h1 className="text-[15px] font-semibold text-ink">{title}</h1>
          <form ref={formRef} onSubmit={goDashboard} className="relative ml-auto hidden md:block">
            <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
            <input name="q" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={closeSoon} placeholder="Cari tools atau proyek…" aria-label="Cari tools atau proyek" autoComplete="off" className="h-8 w-56 rounded-md border border-border bg-surface pl-8 pr-8 text-[13px] placeholder:text-ink-faint focus:border-accent focus:outline-none" />
            {q && <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(""); setOpen(false); }} className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-ink-faint hover:text-ink" aria-label="Bersihkan pencarian"><span aria-hidden>×</span></button>}
            {open && q.trim() && results && (results.toolHits.length > 0 || results.projectHits.length > 0) && (
              <div className="absolute left-0 top-full z-30 mt-1.5 w-96 max-h-[26rem] overflow-y-auto rounded-lg border border-border bg-surface p-1.5 shadow-[0_12px_32px_rgba(43,40,35,0.18)]">
                {results.toolHits.length > 0 && <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Tools ({results.toolHits.length})</p>}
                {results.toolHits.map((t) => <Link key={t.toolId} href={t.route} onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(""); setOpen(false); }} className="flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] hover:bg-surface-muted"><span className="flex size-6 shrink-0 items-center justify-center rounded bg-accent-soft text-accent-strong"><Icon name={t.icon} className="size-3" /></span><span className="min-w-0"><span className="block truncate font-medium text-ink">{t.name}</span><span className="block truncate text-[11px] text-ink-faint">{getCategory(t.category)?.name}</span></span><Icon name="chevron" className="ml-auto size-3 shrink-0 text-ink-faint" /></Link>)}
                {results.projectHits.length > 0 && <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Proyek ({results.projectHits.length})</p>}
                {results.projectHits.map((p) => { const tool = getTool(p.toolId); return <Link key={p.id} href={tool?.route ?? "/projects"} onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(""); setOpen(false); }} className="flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] hover:bg-surface-muted"><span className="flex size-6 shrink-0 items-center justify-center rounded bg-surface-muted text-ink-secondary"><Icon name="folder" className="size-3" /></span><span className="min-w-0"><span className="block truncate font-medium text-ink">{p.name}</span><span className="block truncate text-[11px] text-ink-faint">{tool?.name ?? p.toolId}</span></span></Link>; })}
                <div className="mt-1 border-t border-border px-2.5 py-1.5 text-[11px] text-ink-faint">Tekan <strong>Enter</strong> untuk melihat semua hasil →</div>
              </div>
            )}
          </form>
          <div className="ml-auto flex items-center gap-1 md:ml-2">
            <a href="/help" className="hidden size-8 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-muted sm:flex" title="Bantuan" aria-label="Bantuan"><Icon name="help" className="size-4" /></a>
            <button onClick={() => router.push("/history")} className="flex size-8 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-muted" title="Riwayat" aria-label="Riwayat"><Icon name="history" className="size-4" /></button>
            <button onClick={() => router.push("/account")} className="flex size-8 items-center justify-center rounded-full bg-accent-soft font-bold text-accent-ink" title="Akun" aria-label="Akun">{(session?.name ?? "?").slice(0, 1).toUpperCase()}</button>
          </div>
        </header>

        <main className="app-main mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">
          {!isDashboard && <div className="mb-5"><button type="button" onClick={() => router.push("/dashboard")} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-ink-secondary hover:bg-surface-muted hover:text-ink"><Icon name="chevron" className="size-3.5 rotate-180" />Kembali ke Beranda</button></div>}
          {children}
        </main>
      </div>
      <SupportWidget />
    </div>
  );
}

export { CATEGORIES };
