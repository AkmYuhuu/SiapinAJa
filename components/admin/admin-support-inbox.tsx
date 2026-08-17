"use client";

import { useEffect, useState } from "react";

interface Conversation {
  id: string;
  userName: string;
  subject: string | null;
  status: string;
  type: string;
  updatedAt: string;
}

interface Message {
  id: string;
  senderType: "user" | "admin";
  message: string;
  createdAt: string;
}

interface Application {
  id: string;
  conversationId: string;
  userName: string;
  requestedPackageSlug: string;
  fullName: string;
  businessName: string;
  businessType: string;
  productsServices: string;
  businessAge: string;
  salesChannels: string;
  status: string;
  adminNote: string | null;
}

export default function AdminSupportInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [application, setApplication] = useState<Application | null>(null);
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

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

  useEffect(() => {
    void load();
  }, []);

  async function openConversation(id: string) {
    setSelected(id);
    const response = await fetch(`/api/admin/support?conversationId=${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok) return;
    setMessages(data.messages ?? []);
    setApplication(data.application ?? null);
    setNote(data.application?.adminNote ?? "");
  }

  async function sendReply() {
    if (!selected || !reply.trim() || sending) return;
    setSending(true);
    const response = await fetch("/api/admin/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: selected, message: reply }) });
    setSending(false);
    if (!response.ok) return;
    setReply("");
    await openConversation(selected);
    await load();
  }

  async function review(action: "approve" | "reject" | "needs_info") {
    if (!application || sending) return;
    setSending(true);
    const response = await fetch("/api/admin/early-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId: application.id, action, adminNote: note }) });
    const data = await response.json().catch(() => null);
    setSending(false);
    if (!response.ok) return;
    await load();
    await openConversation(application.conversationId);
    if (data) setApplication((current) => current ? { ...current, status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "needs_info", adminNote: note } : current);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="border-b border-border p-4"><div className="flex items-center justify-between"><h2 className="font-bold text-ink">Inbox</h2><button type="button" onClick={() => void load()} className="text-xs font-semibold text-accent-strong hover:underline">Refresh</button></div><p className="mt-1 text-xs text-ink-faint">Bantuan dan pengajuan Early Access.</p></div>
        {loading ? <p className="p-4 text-sm text-ink-secondary">Memuat…</p> : conversations.length === 0 ? <p className="p-4 text-sm text-ink-secondary">Belum ada percakapan terbuka.</p> : <div className="divide-y divide-border">{conversations.map((item) => <button key={item.id} type="button" onClick={() => void openConversation(item.id)} className={`w-full px-4 py-3 text-left hover:bg-surface-muted ${selected === item.id ? "bg-surface-muted" : ""}`}><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-ink">{item.userName}</span><span className="text-[10px] uppercase text-ink-faint">{item.type === "early_access" ? "Early" : "Support"}</span></div><p className="mt-1 truncate text-xs text-ink-secondary">{item.subject ?? "Bantuan SiapinAja"}</p><p className="mt-1 text-[10px] text-ink-faint">{item.status === "needs_info" ? "Menunggu informasi" : item.status}</p></button>)}</div>}
      </section>

      <section className="min-h-[620px] rounded-lg border border-border bg-surface">
        {!selected ? <div className="flex min-h-[620px] items-center justify-center p-6 text-center text-sm text-ink-secondary">Pilih percakapan untuk melihat detail.</div> : <div className="flex min-h-[620px] flex-col">
          <div className="border-b border-border p-4"><h2 className="text-base font-bold text-ink">{application ? application.businessName : "Percakapan"}</h2><p className="mt-1 text-xs text-ink-secondary">{application ? `${application.fullName} · ${application.requestedPackageSlug}` : "Support pengguna"}</p></div>
          {application && <div className="grid gap-3 border-b border-border bg-surface-muted/40 p-4 text-xs text-ink-secondary sm:grid-cols-2"><p><strong className="text-ink">Jenis usaha:</strong> {application.businessType}</p><p><strong className="text-ink">Lama usaha:</strong> {application.businessAge}</p><p><strong className="text-ink">Produk/jasa:</strong> {application.productsServices}</p><p><strong className="text-ink">Jual lewat:</strong> {application.salesChannels}</p><label className="sm:col-span-2"><span className="font-semibold text-ink">Catatan admin</span><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-ink" placeholder="Catatan internal atau instruksi tambahan…" /></label><div className="flex flex-wrap gap-2 sm:col-span-2"><button type="button" disabled={sending || application.status === "approved"} onClick={() => void review("approve")} className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Approve 30 hari</button><button type="button" disabled={sending || application.status === "rejected"} onClick={() => void review("needs_info")} className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-muted">Minta info</button><button type="button" disabled={sending || application.status === "rejected"} onClick={() => void review("reject")} className="rounded-md border border-danger px-3 py-2 text-xs font-semibold text-danger hover:bg-danger-soft">Reject</button><span className="rounded-full bg-surface-muted px-2 py-1 text-[10px] font-semibold text-ink-secondary">Status: {application.status}</span></div></div>}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">{messages.map((item) => <div key={item.id} className={`flex ${item.senderType === "admin" ? "justify-end" : "justify-start"}`}><div className={`max-w-[78%] rounded-lg px-3 py-2 text-xs leading-relaxed ${item.senderType === "admin" ? "bg-accent text-white" : "bg-surface-muted text-ink"}`}>{item.message}</div></div>)}{messages.length === 0 && <p className="text-sm text-ink-faint">Belum ada pesan.</p>}</div>
          <form className="border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); void sendReply(); }}><div className="flex items-end gap-2"><textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder="Tulis balasan ke user…" className="min-h-10 flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-faint" /><button type="submit" disabled={sending || !reply.trim()} className="rounded-md bg-accent px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{sending ? "Mengirim…" : "Kirim"}</button></div></form>
        </div>}
      </section>
    </div>
  );
}
