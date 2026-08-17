"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/icons";
import type { IconName } from "@/components/icons";
import { BrandWordmark } from "@/components/brand/logo";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const MAIN: NavItem[] = [
  { href: "/dashboard", label: "Beranda", icon: "home" },
  { href: "/projects", label: "Proyek Saya", icon: "folder" },
  { href: "/favorites", label: "Favorit", icon: "star" },
  { href: "/history", label: "Riwayat", icon: "history" },
];

const BOTTOM: NavItem[] = [
  { href: "/pricing", label: "Paket & Billing", icon: "wallet" },
  { href: "/redeem", label: "Aktifkan Kode", icon: "tag" },
  { href: "/settings", label: "Pengaturan", icon: "settings" },
  { href: "/help", label: "Bantuan", icon: "help" },
];

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all ${
              active
                ? "bg-[#fff0e5] font-semibold text-[#c45c0d] shadow-[inset_0_0_0_1px_rgba(232,98,12,0.06)]"
                : "text-ink-secondary hover:bg-[#f8f6f1] hover:text-ink"
            }`}
          >
            <Icon name={item.icon} className={`size-[17px] shrink-0 ${active ? "text-[#e8620c]" : "text-ink-faint group-hover:text-ink-secondary"}`} />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { session, logout } = useAuth();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!session) {
      setIsAdmin(false);
      return;
    }

    fetch("/api/auth/admin-status", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!cancelled) setIsAdmin(response.ok && data?.isAdmin === true);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.userId]);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-[74px] items-center border-b border-[#eeeae2] px-4">
        <BrandWordmark />
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3.5 scroll-thin">
        <NavLinks items={MAIN} onNavigate={onNavigate} />

        <p className="px-3 pb-1.5 pt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Tools</p>

        <Link
          href="/tools"
          onClick={onNavigate}
          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all ${
            pathname === "/tools"
              ? "bg-[#fff0e5] font-semibold text-[#c45c0d]"
              : "text-ink-secondary hover:bg-[#f8f6f1] hover:text-ink"
          }`}
        >
          <Icon name="tools" className={`size-[17px] shrink-0 ${pathname === "/tools" ? "text-[#e8620c]" : "text-ink-faint"}`} />
          Semua tools
        </Link>

        <CategoryNav onNavigate={onNavigate} />

        <div className="my-4 border-t border-[#eeeae2]" />
        <NavLinks items={BOTTOM} onNavigate={onNavigate} />

        {isAdmin && (
          <Link
            href="/admin"
            onClick={onNavigate}
            className={`mt-1 group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all ${
              pathname === "/admin" || pathname.startsWith("/admin/")
                ? "bg-[#fff0e5] font-semibold text-[#c45c0d]"
                : "text-ink-secondary hover:bg-[#f8f6f1] hover:text-ink"
            }`}
          >
            <Icon name="tag" className={`size-[17px] shrink-0 ${pathname.startsWith("/admin") ? "text-[#e8620c]" : "text-ink-faint"}`} />
            Admin
          </Link>
        )}
      </nav>

      <div className="border-t border-[#eeeae2] p-3">
        {session ? (
          <div className="flex items-center gap-2">
            <Link
              href="/account"
              onClick={onNavigate}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-[#f8f6f1]"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#fff0e5] text-sm font-bold text-[#c45c0d] ring-1 ring-[#f6dcc7]">
                {session.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-ink">{session.name}</span>
                <span className="block truncate text-[11px] text-ink-faint">{session.email}</span>
                {isAdmin && <span className="mt-0.5 block text-[10px] font-semibold text-accent-strong">Admin</span>}
              </span>
            </Link>
            <button onClick={logout} title="Keluar" aria-label="Keluar" className="flex size-9 shrink-0 items-center justify-center rounded-xl text-ink-faint hover:bg-[#fff0e5] hover:text-danger">
              <Icon name="logout" className="size-4" />
            </button>
          </div>
        ) : (
          <Link href="/login" onClick={onNavigate} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-[13px] font-semibold text-ink hover:bg-surface-muted">
            <Icon name="lock" className="size-4 text-ink-faint" />
            Masuk
          </Link>
        )}
      </div>
    </div>
  );
}

function CategoryNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const cats = [
    { href: "/tools/umkm", label: "UMKM", icon: "store" as IconName },
    { href: "/tools/freelancer", label: "Freelancer", icon: "briefcase" as IconName },
    { href: "/tools/creator-seller", label: "Creator / Seller", icon: "camera" as IconName },
  ];

  return (
    <div className="space-y-0.5">
      {cats.map((c) => {
        const active = pathname.startsWith(c.href);
        return (
          <Link
            key={c.href}
            href={c.href}
            onClick={onNavigate}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all ${
              active
                ? "bg-[#fff0e5] font-semibold text-[#c45c0d]"
                : "text-ink-secondary hover:bg-[#f8f6f1] hover:text-ink"
            }`}
          >
            <Icon name={c.icon} className={`size-[17px] shrink-0 ${active ? "text-[#e8620c]" : "text-ink-faint"}`} />
            {c.label}
          </Link>
        );
      })}
    </div>
  );
}
