import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import AdminSupportInbox from "@/components/admin/admin-support-inbox";
import AdminSupportChatStyles from "@/components/admin/admin-support-chat-styles";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";

export default async function AdminSupportPage() {
  const admin = await requireAdmin();
  if (!admin.ok) redirect(admin.reason === "no-session" ? "/login?next=/admin/support" : "/dashboard");

  return (
    <div className="admin-support-page mx-auto max-w-6xl space-y-6">
      <AdminSupportChatStyles />
      <header>
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link href="/admin">
            <Button variant="secondary" size="sm">
              <Icon name="chevron" className="size-3.5 rotate-180" />
              Kembali ke Admin
            </Button>
          </Link>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">Admin Support</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Inbox Bantuan & Early Access</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-secondary">Kelola pertanyaan user dan review pengajuan Early Access langsung dari SiapinAja. Tidak ada AI dan tidak ada WhatsApp Bot.</p>
      </header>
      <AdminSupportInbox />
    </div>
  );
}
