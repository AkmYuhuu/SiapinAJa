"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { SidebarContent } from "./sidebar";
import { SupportWidget } from "@/components/support/support-widget";
import AdminSupportNotifier from "@/components/admin/admin-support-notifier";
import { EarlyAccessExpiryPopup } from "@/components/feedback/early-access-expiry-popup";
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
    const toolHits = searchTools(q).filter((t) => t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query));
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
    <div className="min-h-screen bg-[#fbfaf7]">
      <aside className="app-sidebar fixed inset-y-0 left-0 z-30 hidden w-[236px] border-r border-[#e9e4dc] bg-white lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="app-sidebar absolute inset-y-0 left-0 w-72 bg-white shadow-[12px_0_40px_rgba(43,40,35,0.16)]">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="app-shell-content lg:pl-[236px]">
        <header className="app-topbar print-hide sticky top-0 z-20 flex h-[66px] items-center gap-3 border-b border-[#e9e4dc] bg-[#fbfaf7]/95 px-4 backdrop-blur-xl lg:px-7">
          <button className="flex size-9 items-center justify-center rounded-xl text-ink-secondary hover:bg-white lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Buka menu">
            <svg className="size-5" viewBox="0 0 20 20" fill="none" aria-hidden><path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>

          <h1 className="text-[15px] font-bold tracking-[-0.01em] text-ink">{title}</h1>

          <form ref={formRef} onSubmit={goDashboard} className="relative ml-auto hidden md:block">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <input
              name="q"
              value={q}
              onChange={(e) => { setQ(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={closeSoon}
              placeholder="Cari tools atau proyek..."
              aria-label="Cari tools atau proyek"
              autoComplete="off"
              className="h-10 w-[300px] rounded-xl border border-[#e5dfd5] bg-white pl-9 pr-9 text-[13px] shadow-[0_2px_8px_rgba(43,40,35,0.04)] outline-none placeholder:text-ink-faint focus:border-[#efc8a7] focus:ring-4 focus:ring-[#fff0e5] lg:w-[320px]"
            />
            {q && <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(""); setOpen(false); }} className="absolute right-2.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-lg text-ink-faint hover:bg-[#f8f6f1] hover:text-ink" aria-label="Bersihkan pencarian"><span aria-hidden>×</span></button>}
            {open && q.trim() && results && (results.toolHits.length > 0 || results.projectHits.length > 0) && (
              <div className="absolute left-0 top-full z-30 mt-2 max-h-[26rem] w-[380px] overflow-y-auto rounded-2xl border border-[#e8e3da] bg-white p-2 shadow-[0_18px_42px_rgba(43,40,35,0.14)]">
                {results.toolHits.length > 0 && <p className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Tools ({results.toolHits.length})</p>}
                {results.toolHits.map((t) => <Link key={t.toolId} href={t.route} onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(""); setOpen(false); }} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] hover:bg-[#fcfaf6]"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#fff0e5] text-accent-strong"><Icon name={t.icon} className="size-4" /></span><span className="min-w-0"><span className="block truncate font-semibold text-ink">{t.name}</span><span className="block truncate text-[11px] text-ink-faint">{getCategory(t.category)?.name}</span></span><Icon name="chevron" className="ml-auto size-3 shrink-0 text-ink-faint" /></Link>)}
                {results.projectHits.length > 0 && <p className="px-3 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Proyek ({results.projectHits.length})</p>}
                {results.projectHits.map((p) => { const tool = getTool(p.toolId); return <Link key={p.id} href={tool?.route ?? "/projects"} onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(""); setOpen(false); }} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] hover:bg-[#fcfaf6]"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f8f6f1] text-ink-secondary"><Icon name="folder" className="size-4" /></span><span className="min-w-0"><span className="block truncate font-semibold text-ink">{p.name}</span><span className="block truncate text-[11px] text-ink-faint">{tool?.name ?? p.toolId}</span></span></Link>; })}
                <div className="mt-1 border-t border-[#eeeae2] px-3 py-2.5 text-[11px] text-ink-faint">Tekan <strong>Enter</strong> untuk melihat semua hasil →</div>
              </div>
            )}
          </form>

          <div className="ml-auto flex items-center gap-1 md:ml-2">
            <a href="/help" className="hidden size-9 items-center justify-center rounded-xl text-ink-secondary hover:bg-white sm:flex" title="Bantuan" aria-label="Bantuan"><Icon name="help" className="size-[17px]" /></a>
            <button onClick={() => router.push("/history")} className="flex size-9 items-center justify-center rounded-xl text-ink-secondary hover:bg-white" title="Riwayat" aria-label="Riwayat"><Icon name="history" className="size-[17px]" /></button>
            <button onClick={() => router.push("/account")} className="ml-1 flex size-9 items-center justify-center rounded-full bg-[#fff0e5] font-bold text-[#c45c0d] ring-1 ring-[#f3dcc7]" title="Akun" aria-label="Akun">{(session?.name ?? "?").slice(0, 1).toUpperCase()}</button>
          </div>
        </header>

        <main className="app-main mx-auto w-full max-w-[1220px] px-4 py-7 sm:px-5 lg:px-8 lg:py-8">
          {!isDashboard && <div className="mb-6"><button type="button" onClick={() => router.push("/dashboard")} className="inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[12px] font-semibold text-ink-secondary hover:bg-white hover:text-ink"><Icon name="chevron" className="size-3.5 rotate-180" />Kembali ke Beranda</button></div>}
          {children}
        </main>
      </div>

      <AdminSupportNotifier />
      <SupportWidget />
      <EarlyAccessExpiryPopup />
    </div>
  );
}

export { CATEGORIES };
