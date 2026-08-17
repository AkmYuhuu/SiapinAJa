"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";

export default function AdminSupportBadge() {
  const [count, setCount] = useState(0);

  async function load() {
    const response = await fetch("/api/admin/support", { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (response.ok) setCount((data.conversations ?? []).filter((item: { adminReadAt: string | null }) => !item.adminReadAt).length);
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Link href="/admin/support" className="relative inline-flex items-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm font-semibold text-ink hover:bg-surface-muted">
      <Icon name="help" className="size-4" />
      Inbox Bantuan
      {count > 0 && <span className="min-w-5 rounded-full bg-danger px-1.5 py-0.5 text-center text-[10px] font-bold text-white">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}
