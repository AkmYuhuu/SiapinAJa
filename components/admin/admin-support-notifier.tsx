"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UnreadConversation { id: string; adminReadAt: string | null; updatedAt: string; }

export default function AdminSupportNotifier() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const seenMessageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/admin-status", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { isAdmin: false })
      .then((data) => { if (!cancelled) setIsAdmin(Boolean(data?.isAdmin)); })
      .catch(() => { if (!cancelled) setIsAdmin(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const supabase = createSupabaseClient();
    const channel = supabase.channel("admin-global-support-notifier");
    channelRef.current = channel;

    const refreshUnread = async () => {
      const response = await fetch("/api/admin/support", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) return;
      const unread = (data.conversations ?? []).filter((item: UnreadConversation) => {
        if (!item.adminReadAt) return true;
        return new Date(item.updatedAt).getTime() > new Date(item.adminReadAt).getTime();
      });
      setCount(unread.length);
      if (unread.length > 0) setVisible(true);
    };

    void refreshUnread();

    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, (payload) => {
        const row = payload.new as { id: string; sender_type: string };
        if (row.sender_type !== "user" || seenMessageIds.current.has(row.id)) return;
        seenMessageIds.current.add(row.id);
        setVisible(true);
        void refreshUnread();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_conversations" }, () => {
        setVisible(true);
        void refreshUnread();
      })
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const message = payload?.message as { id?: string; senderType?: string } | undefined;
        if (!message || message.senderType !== "user") return;
        if (message.id && seenMessageIds.current.has(message.id)) return;
        if (message.id) seenMessageIds.current.add(message.id);
        setVisible(true);
        void refreshUnread();
      })
      .subscribe();

    const timer = window.setInterval(() => void refreshUnread(), 15000);
    return () => {
      window.clearInterval(timer);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  if (!isAdmin || !visible) return null;

  return (
    <button type="button" onClick={() => { setVisible(false); router.push("/admin/support"); }} className="fixed right-5 top-5 z-[100] w-[min(92vw,340px)] rounded-xl border border-border bg-surface px-4 py-3 text-left shadow-[0_16px_44px_rgba(43,40,35,0.18)] transition hover:-translate-y-0.5" aria-label="Buka pesan baru dari user">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-danger text-white"><span className="size-2.5 rounded-full bg-white" /></span>
        <span className="min-w-0"><span className="block text-sm font-bold text-ink">Pesan baru</span><span className="mt-0.5 block text-xs text-ink-secondary">Ada chat terbaru dari user. Klik untuk membuka Inbox.</span></span>
        {count > 0 && <span className="ml-auto shrink-0 rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold text-white">{count > 99 ? "99+" : count}</span>}
      </div>
    </button>
  );
}
