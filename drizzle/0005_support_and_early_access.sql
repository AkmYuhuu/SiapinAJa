-- V1 support inbox + Early Access application workflow.
-- Manual payment V1 continues to use redemption_codes; no AI or payment webhook is required.

CREATE TABLE IF NOT EXISTS public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'support',
  subject text,
  status text NOT NULL DEFAULT 'open',
  user_read_at timestamptz,
  admin_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_conversations_type_check CHECK (type IN ('support','early_access')),
  CONSTRAINT support_conversations_status_check CHECK (status IN ('open','needs_info','resolved','closed'))
);

CREATE INDEX IF NOT EXISTS support_conversations_user_id_idx ON public.support_conversations(user_id);
CREATE INDEX IF NOT EXISTS support_conversations_status_idx ON public.support_conversations(status);
CREATE INDEX IF NOT EXISTS support_conversations_updated_at_idx ON public.support_conversations(updated_at DESC);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_type text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_messages_sender_type_check CHECK (sender_type IN ('user','admin')),
  CONSTRAINT support_messages_message_nonempty_check CHECK (length(trim(message)) > 0 AND length(message) <= 5000)
);

CREATE INDEX IF NOT EXISTS support_messages_conversation_id_idx ON public.support_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS public.early_access_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL UNIQUE REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_package_slug text NOT NULL,
  full_name text NOT NULL,
  business_name text NOT NULL,
  business_type text NOT NULL,
  products_services text NOT NULL,
  business_age text NOT NULL,
  sales_channels text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT early_access_status_check CHECK (status IN ('pending','needs_info','approved','rejected')),
  CONSTRAINT early_access_package_check CHECK (requested_package_slug IN ('umkm','freelancer','creator'))
);

CREATE INDEX IF NOT EXISTS early_access_applications_status_idx ON public.early_access_applications(status);
CREATE INDEX IF NOT EXISTS early_access_applications_user_id_idx ON public.early_access_applications(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_unique ON public.user_roles(user_id);

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.early_access_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_conversations_user_select ON public.support_conversations
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());
CREATE POLICY support_conversations_user_insert ON public.support_conversations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY support_conversations_user_update ON public.support_conversations
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY support_messages_user_select ON public.support_messages
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.support_conversations c
      WHERE c.id = conversation_id AND c.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY support_messages_user_insert ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = (SELECT auth.uid()) AND (sender_type = 'user' OR public.is_admin()));

CREATE POLICY early_access_user_select ON public.early_access_applications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());
CREATE POLICY early_access_user_insert ON public.early_access_applications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY early_access_admin_update ON public.early_access_applications
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
