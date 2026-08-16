"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/icons";
import type { IconName } from "@/components/icons";

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/dashboard" className={`flex items-center gap-2 ${className}`}>
      <span className="flex size-7 items-center justify-center rounded-md bg-accent">
        <Icon name="tools" className="size-4 text-white" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[15px] font-bold tracking-tight text-ink">
          Siapin<span className="text-accent-strong">Aja</span>
        </span>
        <span className="text-[8px] font-semibold uppercase tracking-[0.11em] text-ink-faint">Early Access</span>
      </span>
    </Link>
  );
}

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
            className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
              active
                ? "bg-accent-soft font-semibold text-accent-ink"
                : "text-ink-secondary hover:bg-surface-muted hover:text-ink"
            }`}
          >
            <Icon name={item.icon} className="size-4" />
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
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Wordmark />
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto scroll-thin px-2.5 py-3">
        <NavLinks items={MAIN} onNavigate={onNavigate} />

        <p className="px-2.5 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
          Tools
        </p>
        <Link
          href="/tools"
          onClick={onNavigate}
          className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
            pathname === "/tools"
              ? "bg-accent-soft font-semibold text-accent-ink"
              : "text-ink-secondary hover:bg-surface-muted hover:text-ink"
          }`}
        >
          <Icon name="tools" className="size-4" />
          Semua tools
        </Link>
        <CategoryNav onNavigate={onNavigate} />

        <div className="my-3 border-t border-border" />
        <NavLinks items={BOTTOM} onNavigate={onNavigate} />

        {isAdmin && (
          <Link
            href="/admin"
            onClick={onNavigate}
            className={`mt-1 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
              pathname === "/admin" || pathname.startsWith("/admin/")
                ? "bg-accent-soft font-semibold text-accent-ink"
                : "text-ink-secondary hover:bg-surface-muted hover:text-ink"
            }`}
          >
            <Icon name="tag" className="size-4" />
            Admin
          </Link>
        )}
      </nav>
      <div className="border-t border-border p-2.5">
        {session ? (
          <div className="flex items-center gap-1">
            <Link
              href="/account"
              onClick={onNavigate}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-surface-muted"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-surface text-xs font-bold text-accent-ink">
                {session.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-ink">{session.name}</span>
                <span className="block truncate text-[11px] text-ink-faint">{session.email}</span>
                {isAdmin && <span className="block text-[10px] font-semibold text-accent-strong">Admin</span>}
              </span>
            </Link>
            <button onClick={logout} title="Keluar" aria-label="Keluar" className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-muted hover:text-danger">
              <Icon name="logout" className="size-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            onClick={onNavigate}
            className="flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-[13px] font-medium text-ink hover:bg-surface-muted"
          >
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
            className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
              active
                ? "bg-accent-soft font-semibold text-accent-ink"
                : "text-ink-secondary hover:bg-surface-muted hover:text-ink"
            }`}
          >
            <Icon name={c.icon} className="size-4" />
            {c.label}
          </Link>
        );
      })}
    </div>
  );
}
