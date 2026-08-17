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
  const [remainingMs, setRemainingMs] = useState(5000);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const seenMessageIds = useRef<Set<string>>(new Set());
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

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
      if (unread.length > 0) showNotice();
    };

    void refreshUnread();
    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, (payload) => {
        const row = payload.new as { id: string; sender_type: string };
        if (row.sender_type !== "user" || seenMessageIds.current.has(row.id)) return;
        seenMessageIds.current.add(row.id);
        showNotice();
        void refreshUnread();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_conversations" }, () => {
        showNotice();
        void refreshUnread();
      })
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const message = payload?.message as { id?: string; senderType?: string } | undefined;
        if (!message || message.senderType !== "user") return;
        if (message.id && seenMessageIds.current.has(message.id)) return;
        if (message.id) seenMessageIds.current.add(message.id);
        showNotice();
        void refreshUnread();
      })
      .subscribe();

    const timer = window.setInterval(() => void refreshUnread(), 15000);
    return () => {
      window.clearInterval(timer);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  function showNotice() {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    setVisible(true);
    setRemainingMs(5000);
    const startedAt = Date.now();
    countdownTimer.current = setInterval(() => {
      const left = Math.max(0, 5000 - (Date.now() - startedAt));
      setRemainingMs(left);
      if (left <= 0 && countdownTimer.current) clearInterval(countdownTimer.current);
    }, 100);
    dismissTimer.current = setTimeout(() => {
      setVisible(false);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    }, 5000);
  }

  function dismiss() {
    setVisible(false);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
  }

  function openInbox() {
    dismiss();
    router.push("/admin/support");
  }

  if (!isAdmin || !visible) return null;
  const progress = Math.max(0, Math.min(100, (remainingMs / 5000) * 100));

  return (
    <div className="fixed right-5 top-5 z-[100] w-[min(92vw,360px)]">
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_18px_48px_rgba(43,40,35,0.2)]">
        <button
          type="button"
          onClick={openInbox}
          className="block w-full px-4 py-3 text-left transition hover:bg-surface-muted/70"
          aria-label="Buka Inbox Bantuan"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-danger text-white">
              <span className="size-2.5 rounded-full bg-white" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink">Pesan baru</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-secondary">Ada chat terbaru dari user. Klik untuk membuka chat admin.</span>
            </span>
            {count > 0 && <span className="shrink-0 rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold text-white">{count > 99 ? "99+" : count}</span>}
          </div>
        </button>

        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] text-ink-faint">
          <span>Notifikasi otomatis ditutup</span>
          <span>{Math.max(1, Math.ceil(remainingMs / 1000))}s</span>
        </div>
        <div className="flex items-center gap-3 border-t border-border px-4 py-2">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-ink-secondary hover:bg-surface-muted hover:text-ink"
          >
            Dismiss
          </button>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full bg-danger transition-[width] duration-100 linear" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
