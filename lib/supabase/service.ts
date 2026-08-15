import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client: trusted backend operations ONLY (webhook, admin,
// subscription activation). Never expose this to the browser - the key stays
// server-side via SUPABASE_SERVICE_ROLE_KEY. RLS is bypassed by design here;
// every caller must enforce its own authorization.
let serviceClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createServiceClient() {
  if (serviceClient) return serviceClient;
  serviceClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return serviceClient;
}
