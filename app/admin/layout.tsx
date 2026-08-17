import type { ReactNode } from "react";
import AdminSupportNotifier from "@/components/admin/admin-support-notifier";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <><AdminSupportNotifier />{children}</>;
}
