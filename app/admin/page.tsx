import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import AdminRedemptionCodes from "@/components/admin/admin-redemption-codes";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin.ok) redirect(admin.reason === "no-session" ? "/login?next=/admin" : "/dashboard");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard">
            <Button variant="secondary" size="sm">
              <Icon name="chevron" className="size-3.5 rotate-180" />
              Kembali ke Beranda
            </Button>
          </Link>
          <Link href="/admin/support">
            <Button variant="secondary" size="sm">
              <Icon name="help" className="size-3.5" />
              Inbox Bantuan
            </Button>
          </Link>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Aktivasi manual & operasional</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-secondary">
          Setelah pembayaran manual benar-benar dikonfirmasi, buat kode aktivasi sekali pakai. Pengajuan Early Access dan chat bantuan dikelola di Inbox Bantuan.
        </p>
      </header>
      <AdminRedemptionCodes />
    </div>
  );
}
