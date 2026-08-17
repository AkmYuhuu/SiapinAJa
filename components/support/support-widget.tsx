"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

interface Conversation {
  id: string;
  type: "support" | "early_access";
  subject: string | null;
  status: string;
  updatedAt: string;
}

interface Message {
  id: string;
  senderType: "user" | "admin";
  message: string;
  createdAt: string;
}

const packages = [
  { slug: "umkm", name: "UMKM" },
  { slug: "freelancer", name: "Freelancer" },
  { slug: "creator", name: "Creator / Seller" },
];

function mergeMessage(current: Message[], incoming: Message) {
  if (current.some((item) => item.id === incoming.id)) return current;
  return [...current, incoming].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
}

export function SupportWidget() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "early" | "chat">("menu");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [earlyStatus, setEarlyStatus] = useState<string>("");
  const [earlyConversationId, setEarlyConversationId] = useState("");
  const [form, setForm] = useState({
    requestedPackageSlug: "umkm",
    fullName: session?.name ?? "",
    businessName: "",
    businessType: "",
    productsServices: "",
    businessAge: "",
    salesChannels: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) return;
    void loadConversations();
    void loadEarlyAccess();
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const supabase = createSupabaseClient();
    const channel = supabase
      .channel(`support-user:${session.userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        (payload) => {
          const row = payload.new as { id: string; conversation_id: string; sender_type: Message["senderType"]; message: string; created_at: string };
          if (row.sender_type === "admin" && row.conversation_id === conversationId) {
            setMessages((current) => mergeMessage(current, { id: row.id, senderType: row.sender_type, message: row.message, createdAt: row.created_at }));
          }
          void loadConversations();
          if (view === "chat" && row.conversation_id === conversationId) {
            void loadConversation(row.conversation_id, true);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "support_conversations" },
        (payload) => {
          const row = payload.new as { id: string; status: string; updated_at: string };
          setConversations((current) => current.map((item) => item.id === row.id ? { ...item, status: row.status, updatedAt: row.updated_at } : item));
          if (row.id === conversationId) {
            void loadConversation(row.id, true);
          }
          void loadEarlyAccess();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "early_access_applications" },
        () => {
          void loadEarlyAccess();
          void loadConversations();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session, conversationId, view]);

  const currentConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === conversationId),
    [conversations, conversationId],
  );

  async function loadConversations() {
    const response = await fetch("/api/support", { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (response.ok) setConversations(data.conversations ?? []);
  }

  async function loadConversation(id: string, silent = false) {
    if (!silent) setLoading(true);
    const response = await fetch(`/api/support?conversationId=${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!silent) setLoading(false);
    if (!response.ok) return;
    setConversationId(id);
    setMessages(data.messages ?? []);
    setConversations((items) => items.map((item) => (item.id === id ? { ...item, status: data.conversation.status, updatedAt: data.conversation.updatedAt } : item)));
  }

  async function loadEarlyAccess() {
    const response = await fetch("/api/early-access", { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (response.ok && data.application) {
      setEarlyStatus(data.application.status);
      setEarlyConversationId(data.application.conversationId);
    }
  }

  function resetPanel() {
    setView("menu");
    setMessage("");
    setConversationId("");
    setMessages([]);
  }

  if (!session) return null;

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-[min(92vw,390px)] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_18px_50px_rgba(43,40,35,0.2)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-bold text-ink">Bantuan SiapinAja</p>
              <p className="text-[11px] text-ink-faint">Early Access & bantuan langsung</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="flex size-8 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-muted" aria-label="Tutup">
              <span className="text-lg">×</span>
            </button>
          </div>

          {view === "menu" && (
            <div className="space-y-2 p-3">
              <button type="button" onClick={() => setView("early")} className="w-full rounded-lg border border-border p-3 text-left hover:bg-surface-muted">
                <div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-strong"><Icon name="star" className="size-4" /></span><span><span className="block text-sm font-semibold text-ink">Ikut Early Access</span><span className="mt-0.5 block text-xs leading-relaxed text-ink-secondary">Coba gratis 30 hari dan bantu kami memperbaiki SiapinAja.</span></span></div>
              </button>
              <button type="button" onClick={() => { setView("chat"); const id = conversations[0]?.id ?? ""; if (id) void loadConversation(id); }} className="w-full rounded-lg border border-border p-3 text-left hover:bg-surface-muted">
                <div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-ink-secondary"><Icon name="help" className="size-4" /></span><span><span className="block text-sm font-semibold text-ink">Hubungi Admin</span><span className="mt-0.5 block text-xs leading-relaxed text-ink-secondary">Laporkan masalah, tanyakan cara memakai tool, atau minta bantuan.</span></span></div>
              </button>
              {conversations.length > 0 && <div className="pt-2"><p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Percakapan terbaru</p>{conversations.slice(0, 3).map((item) => <button key={item.id} type="button" onClick={() => { setView("chat"); void loadConversation(item.id); }} className="mt-1 flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left hover:bg-surface-muted"><span className="truncate text-xs font-medium text-ink">{item.subject ?? "Bantuan SiapinAja"}</span><span className="ml-2 text-[10px] text-ink-faint">{item.status === "needs_info" ? "Balasan dibutuhkan" : item.status}</span></button>)}</div>}
            </div>
          )}

          {view === "early" && (
            <div className="max-h-[70vh] overflow-y-auto p-4">
              <button type="button" onClick={resetPanel} className="mb-3 text-xs font-medium text-ink-secondary hover:text-ink">← Kembali</button>
              <h2 className="text-base font-bold text-ink">Early Access Gratis 30 Hari</h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-secondary">Program ini untuk pengguna awal yang benar-benar menjalankan usaha. Kami akan review pengajuanmu secara manual dan mungkin mengajukan pertanyaan lanjutan di chat.</p>
              {earlyStatus ? (
                <div className="mt-4 rounded-lg border border-border bg-surface-muted p-3 text-sm"><p className="font-semibold text-ink">Status: {earlyStatus === "needs_info" ? "Butuh informasi tambahan" : earlyStatus === "approved" ? "Disetujui" : earlyStatus === "rejected" ? "Belum disetujui" : "Sedang ditinjau"}</p>{earlyConversationId && <button type="button" onClick={() => { setView("chat"); void loadConversation(earlyConversationId); }} className="mt-2 text-xs font-semibold text-accent-strong hover:underline">Buka percakapan</button>}</div>
              ) : (
                <form className="mt-4 space-y-3" onSubmit={async (event) => { event.preventDefault(); setLoading(true); const response = await fetch("/api/early-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const data = await response.json().catch(() => null); setLoading(false); if (!response.ok) { setEarlyStatus(data?.error?.message ?? "Gagal mengirim pengajuan."); return; } setEarlyStatus("pending"); setEarlyConversationId(data.conversationId); }}>
                  <label className="block text-xs font-semibold text-ink">Paket yang ingin dicoba<select value={form.requestedPackageSlug} onChange={(e) => setForm({ ...form, requestedPackageSlug: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm font-normal text-ink"><option value="umkm">UMKM</option><option value="freelancer">Freelancer</option><option value="creator">Creator / Seller</option></select></label>
                  {[
                    ["fullName", "Nama", "Nama kamu"],
                    ["businessName", "Nama usaha", "Nama usaha / brand"],
                    ["businessType", "Jenis usaha", "Contoh: kuliner, reseller, jasa desain"],
                    ["productsServices", "Menjual produk/jasa apa", "Jelaskan singkat"],
                    ["businessAge", "Sudah berjalan berapa lama", "Contoh: 2 tahun"],
                    ["salesChannels", "Biasanya jualan lewat apa", "Contoh: WhatsApp, Instagram, marketplace"],
                  ].map(([key, label, placeholder]) => <label key={key} className="block text-xs font-semibold text-ink">{label}<input required value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm font-normal text-ink placeholder:text-ink-faint" /></label>)}
                  <label className="flex items-start gap-2 rounded-md border border-border p-3 text-xs leading-relaxed text-ink-secondary"><input required type="checkbox" className="mt-0.5" />Saya memahami program Early Access dan bersedia memberikan feedback penggunaan SiapinAja.</label>
                  <button type="submit" disabled={loading} className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50">{loading ? "Mengirim…" : "Ajukan Early Access"}</button>
                  {earlyStatus && earlyStatus !== "pending" && <p className="text-xs text-danger">{earlyStatus}</p>}
                </form>
              )}
            </div>
          )}

          {view === "chat" && (
            <div className="flex h-[520px] flex-col">
              <div className="border-b border-border px-4 py-2"><button type="button" onClick={resetPanel} className="text-xs font-medium text-ink-secondary hover:text-ink">← Kembali</button><p className="mt-1 text-sm font-semibold text-ink">{currentConversation?.subject ?? "Chat Admin"}</p></div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {loading && messages.length === 0 && <p className="text-xs text-ink-faint">Memuat…</p>}
                {messages.length === 0 && !loading && <div className="rounded-lg bg-surface-muted p-3 text-xs leading-relaxed text-ink-secondary">Belum ada percakapan. Kirim pesan pertamamu ke admin.</div>}
                {messages.map((item) => <div key={item.id} className={`flex ${item.senderType === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-lg px-3 py-2 text-xs leading-relaxed ${item.senderType === "user" ? "bg-accent text-white" : "bg-surface-muted text-ink"}`}>{item.message}</div></div>)}
              </div>
              <form className="border-t border-border p-3" onSubmit={async (event) => { event.preventDefault(); if (!message.trim() || sending) return; setSending(true); const response = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: conversationId || undefined, message }) }); const data = await response.json().catch(() => null); setSending(false); if (!response.ok) return; setMessage(""); const id = data.conversationId ?? conversationId; setConversationId(id); await loadConversation(id); await loadConversations(); }}>
                <div className="flex items-end gap-2"><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Tulis pesan…" className="min-h-10 flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-faint" /><button type="submit" disabled={sending || !message.trim()} className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-white disabled:opacity-40" aria-label="Kirim"><span className="text-base">↑</span></button></div>
              </form>
            </div>
          )}
        </div>
      )}

      <button type="button" onClick={() => setOpen((value) => !value)} className="fixed bottom-4 right-4 z-50 flex size-12 items-center justify-center rounded-full border border-border bg-accent text-white shadow-[0_10px_28px_rgba(43,40,35,0.2)] transition-transform hover:scale-105" aria-label="Bantuan SiapinAja" title="Bantuan SiapinAja"><Icon name="help" className="size-5" /></button>
    </>
  );
}
