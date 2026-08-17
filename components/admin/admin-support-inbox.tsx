"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

interface Conversation {
  id: string;
  userId: string;
  userName: string;
  subject: string | null;
  status: string;
  type: string;
  updatedAt: string;
  userReadAt: string | null;
  adminReadAt: string | null;
}
interface Message { id: string; senderType: "user" | "admin"; message: string; createdAt: string; }
interface Application { id: string; conversationId: string; userName: string; requestedPackageSlug: string; fullName: string; businessName: string; businessType: string; productsServices: string; businessAge: string; salesChannels: string; status: string; adminNote: string | null; }

function mergeMessage(current: Message[], incoming: Message) {
  if (current.some((item) => item.id === incoming.id)) return current;
  return [...current, incoming].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
}

function isUnread(conversation: Conversation) {
  if (!conversation.updatedAt) return false;
  if (!conversation.adminReadAt) return true;
  return new Date(conversation.updatedAt).getTime() > new Date(conversation.adminReadAt).getTime();
}

function TypingDots({ label }: { label: string }) {
  return <div className="flex justify-start"><div className="rounded-lg bg-surface-muted px-3 py-2"><span className="inline-flex items-center gap-1" aria-label={label}><span className="size-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.2s]" /><span className="size-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.1s]" /><span className="size-1.5 animate-bounce rounded-full bg-ink-faint" /></span></div></div>;
}

export default function AdminSupportInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selected, setSelected] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [application, setApplication] = useState<Application | null>(null);
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userTyping, setUserTyping] = useState(false);
  const [notice, setNotice] = useState("");

  const adminNotifyRef = useRef<RealtimeChannel | null>(null);
  const conversationRef = useRef<RealtimeChannel | null>(null);
  const userNotifyRef = useRef<RealtimeChannel | null>(null);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRef = useRef("");

  selectedRef.current = selected;

  useEffect(() => {
    void load();

    const supabase = createSupabaseClient();
    const channel = supabase.channel("support-admin-notify");
    adminNotifyRef.current = channel;
    channel.on("broadcast", { event: "message" }, ({ payload }) => {
      const conversationId = String(payload?.conversationId ?? "");
      if (!conversationId) return;
      if (conversationId === selectedRef.current) {
        void openConversation(conversationId, true);
      } else {
        showNotice("Ada chat terbaru");
        void load();
      }
    }).subscribe();

    return () => {
      adminNotifyRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!selected) { setUserTyping(false); return; }
    const supabase = createSupabaseClient();
    const channel = supabase.channel(`support-conversation:${selected}`);
    conversationRef.current = channel;
    channel.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload?.senderType !== "user") return;
      if (typingHideTimer.current) clearTimeout(typingHideTimer.current);
      const typing = Boolean(payload?.isTyping);
      setUserTyping(typing);
      if (typing) typingHideTimer.current = setTimeout(() => setUserTyping(false), 2200);
    }).subscribe();
    return () => {
      if (typingHideTimer.current) clearTimeout(typingHideTimer.current);
      conversationRef.current = null;
      setUserTyping(false);
      void supabase.removeChannel(channel);
    };
  }, [selected]);

  useEffect(() => {
    if (!selectedUserId) { userNotifyRef.current = null; return; }
    const supabase = createSupabaseClient();
    const channel = supabase.channel(`support-user:${selectedUserId}`);
    userNotifyRef.current = channel;
    channel.subscribe();
    return () => {
      userNotifyRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [selectedUserId]);

  function showNotice(text: string) {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 5000);
  }

  async function load() {
    setLoading(true);
    const [supportResponse, earlyResponse] = await Promise.all([
      fetch("/api/admin/support", { cache: "no-store" }),
      fetch("/api/admin/early-access", { cache: "no-store" }),
    ]);
    const supportData = await supportResponse.json().catch(() => null);
    const earlyData = await earlyResponse.json().catch(() => null);
    if (supportResponse.ok) setConversations(supportData.conversations ?? []);
    if (earlyResponse.ok) setApplications(earlyData.applications ?? []);
    setLoading(false);
  }

  async function openConversation(id: string, silent = false) {
    const response = await fetch(`/api/admin/support?conversationId=${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok) return;
    setSelected(id);
    setSelectedUserId(data.conversation.userId ?? "");
    setMessages(Array.isArray(data.messages) ? data.messages : []);
    setApplication(data.application ?? null);
    setNote(data.application?.adminNote ?? "");
    if (!silent) setLoading(false);
    setConversations((items) => items.map((item) => item.id === id ? { ...item, adminReadAt: new Date().toISOString() } : item));
  }

  function publishTyping(isTyping: boolean) {
    if (!selected) return;
    void conversationRef.current?.send({ type: "broadcast", event: "typing", payload: { senderType: "admin", conversationId: selected, isTyping } });
  }

  function handleReplyChange(value: string) {
    setReply(value);
    if (!selected) return;
    publishTyping(Boolean(value.trim()));
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => publishTyping(false), 1700);
  }

  async function sendReply(event?: React.FormEvent) {
    event?.preventDefault();
    if (!selected || !reply.trim() || sending) return;
    const text = reply.trim();
    setSending(true);
    publishTyping(false);
    const response = await fetch("/api/admin/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: selected, message: text }) });
    const data = await response.json().catch(() => null);
    setSending(false);
    if (!response.ok) return;
    setReply("");
    if (data.message) {
      setMessages((current) => mergeMessage(current, data.message as Message));
      void userNotifyRef.current?.send({ type: "broadcast", event: "message", payload: { conversationId: selected, message: data.message } });
    }
  }

  async function review(action: "approve" | "reject" | "needs_info") {
    if (!application || sending) return;
    setSending(true);
    const response = await fetch("/api/admin/early-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId: application.id, action, adminNote: note }) });
    const data = await response.json().catch(() => null);
    setSending(false);
    if (!response.ok) return;
    await load();
    await openConversation(application.conversationId, true);
    if (data) setApplication((current) => current ? { ...current, status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "needs_info", adminNote: note } : current);
  }

  const unreadCount = conversations.filter(isUnread).length;

  return <>
    {notice && <button type="button" onClick={() => { setNotice(""); const latest = conversations.find(isUnread); if (latest) void openConversation(latest.id); }} className="fixed bottom-5 right-5 z-[80] rounded-lg border border-border bg-surface px-4 py-3 text-left shadow-xl"><p className="text-sm font-semibold text-ink">Ada chat terbaru</p><p className="mt-0.5 text-xs text-ink-secondary">Klik untuk membuka percakapan terbaru.</p></button>}

    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="border-b border-border p-4"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold text-ink">Inbox {unreadCount > 0 && <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">{unreadCount}</span>}</h2><button type="button" onClick={() => void load()} className="text-xs font-semibold text-accent-strong hover:underline">Refresh</button></div><p className="mt-1 text-xs text-ink-faint">Bantuan dan pengajuan Early Access.</p></div>
        {loading ? <p className="p-4 text-sm text-ink-secondary">Memuat…</p> : conversations.length === 0 ? <p className="p-4 text-sm text-ink-secondary">Belum ada percakapan terbuka.</p> : <div className="divide-y divide-border">{conversations.map((item) => { const unread = isUnread(item); return <button key={item.id} type="button" onClick={() => void openConversation(item.id)} className={`w-full px-4 py-3 text-left hover:bg-surface-muted ${selected === item.id ? "bg-surface-muted" : ""}`}><div className="flex items-center justify-between gap-2"><span className={`truncate text-sm ${unread ? "font-extrabold text-ink" : "font-semibold text-ink"}`}>{item.userName}</span><span className="flex items-center gap-1 text-[10px] uppercase text-ink-faint">{unread && <span className="size-2 rounded-full bg-danger" />}{item.type === "early_access" ? "Early" : "Support"}</span></div><p className="mt-1 truncate text-xs text-ink-secondary">{item.subject ?? "Bantuan SiapinAja"}</p><p className="mt-1 text-[10px] text-ink-faint">{item.status === "needs_info" ? "Menunggu informasi" : item.status}</p></button>; })}</div>}
      </section>
      <section className="min-h-[620px] rounded-lg border border-border bg-surface">
        {!selected ? <div className="flex min-h-[620px] items-center justify-center p-6 text-center text-sm text-ink-secondary">Pilih percakapan untuk melihat detail.</div> : <div className="flex min-h-[620px] flex-col">
          <div className="border-b border-border p-4"><h2 className="text-base font-bold text-ink">{application ? application.businessName : "Percakapan"}</h2><p className="mt-1 text-xs text-ink-secondary">{application ? `${application.fullName} · ${application.requestedPackageSlug}` : "Support pengguna"}</p></div>
          {application && <div className="grid gap-3 border-b border-border bg-surface-muted/40 p-4 text-xs text-ink-secondary sm:grid-cols-2"><p><strong className="text-ink">Jenis usaha:</strong> {application.businessType}</p><p><strong className="text-ink">Lama usaha:</strong> {application.businessAge}</p><p><strong className="text-ink">Produk/jasa:</strong> {application.productsServices}</p><p><strong className="text-ink">Jual lewat:</strong> {application.salesChannels}</p><label className="sm:col-span-2"><span className="font-semibold text-ink">Catatan admin</span><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-ink" placeholder="Catatan internal atau instruksi tambahan…" /></label><div className="flex flex-wrap gap-2 sm:col-span-2"><button type="button" disabled={sending || application.status === "approved"} onClick={() => void review("approve")} className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Approve 30 hari</button><button type="button" disabled={sending || application.status === "rejected"} onClick={() => void review("needs_info")} className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-muted">Minta info</button><button type="button" disabled={sending || application.status === "rejected"} onClick={() => void review("reject")} className="rounded-md border border-danger px-3 py-2 text-xs font-semibold text-danger hover:bg-danger-soft">Reject</button><span className="rounded-full bg-surface-muted px-2 py-1 text-[10px] font-semibold text-ink-secondary">Status: {application.status}</span></div></div>}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">{messages.map((item) => <div key={item.id} className={`flex ${item.senderType === "admin" ? "justify-end" : "justify-start"}`}><div className={`max-w-[78%] rounded-lg px-3 py-2 text-xs leading-relaxed ${item.senderType === "admin" ? "bg-accent text-white" : "bg-surface-muted text-ink"}`}>{item.message}</div></div>)}{messages.length === 0 && <p className="text-sm text-ink-faint">Belum ada pesan.</p>}{userTyping && <TypingDots label="User sedang mengetik" />}</div>
          <form className="border-t border-border p-3" onSubmit={(e) => void sendReply(e)}><div className="flex items-end gap-2"><textarea value={reply} onChange={(e) => handleReplyChange(e.target.value)} rows={2} placeholder="Tulis balasan ke user…" className="min-h-10 flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-faint" /><button type="submit" disabled={sending || !reply.trim()} className="rounded-md bg-accent px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{sending ? "Mengirim…" : "Kirim"}</button></div></form>
        </div>}
      </section>
    </div>
  </>;
}
