"use client";

import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/components/auth/auth-provider";
import { EarlyAccessEndedNotice } from "@/components/early-access/early-access-ended-notice";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <EarlyAccessEndedNotice />
        {children}
      </AuthProvider>
    </ToastProvider>
  );
}
