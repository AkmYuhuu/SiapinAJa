-- Add an expiry timestamp to redemption codes.
-- The code expires after the package duration from the moment it is generated.
ALTER TABLE public.redemption_codes
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE public.redemption_codes
SET expires_at = created_at + make_interval(days => duration_days)
WHERE expires_at IS NULL;

ALTER TABLE public.redemption_codes
  ALTER COLUMN expires_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS redemption_codes_expires_at_idx
  ON public.redemption_codes(expires_at);
