import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import AdminRedemptionCodes from "@/components/admin/admin-redemption-codes";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin.ok) redirect(admin.reason === "no-session" ? "/login?next=/admin" : "/dashboard");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Aktivasi pembayaran manual</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-secondary">
          Buat kode sekali pakai setelah pembayaran dikonfirmasi. Kode hanya disimpan sebagai hash dan tidak dapat digunakan dua kali.
        </p>
      </header>
      <AdminRedemptionCodes />
    </div>
  );
}
