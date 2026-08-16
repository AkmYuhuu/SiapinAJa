-- Manual payment activation: one-time bearer codes.
-- Codes are server-only credentials. RLS is enabled with no client policies;
-- the application uses the server-side DATABASE_URL connection.

CREATE TABLE IF NOT EXISTS public.redemption_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  code_prefix text NOT NULL,
  package_id uuid NOT NULL REFERENCES public.packages(id),
  duration_days integer NOT NULL,
  status text NOT NULL DEFAULT 'active',
  redeemed_by uuid REFERENCES public.profiles(id),
  redeemed_at timestamptz,
  subscription_id uuid REFERENCES public.subscriptions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT redemption_codes_duration_positive_check CHECK (duration_days > 0),
  CONSTRAINT redemption_codes_status_check CHECK (status IN ('active', 'redeemed', 'revoked'))
);

CREATE INDEX IF NOT EXISTS redemption_codes_status_idx
  ON public.redemption_codes(status);

CREATE INDEX IF NOT EXISTS redemption_codes_package_id_idx
  ON public.redemption_codes(package_id);

ALTER TABLE public.redemption_codes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.redemption_codes FROM anon, authenticated;
