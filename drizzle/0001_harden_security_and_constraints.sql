-- Harden Supabase security-definer functions and enforce V1 data invariants.

ALTER POLICY admin_actions_admin_all ON public.admin_actions TO authenticated;
ALTER POLICY package_tools_admin_write ON public.package_tools TO authenticated;
ALTER POLICY packages_admin_write ON public.packages TO authenticated;
ALTER POLICY payments_admin_all ON public.payments TO authenticated;
ALTER POLICY subscriptions_admin_all ON public.subscriptions TO authenticated;
ALTER POLICY tools_admin_write ON public.tools TO authenticated;
ALTER POLICY user_roles_admin_all ON public.user_roles TO authenticated;
ALTER POLICY webhook_events_admin_all ON public.webhook_events TO authenticated;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_auth_users_fk
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('user', 'admin'));

ALTER TABLE public.packages
  ADD CONSTRAINT packages_price_nonnegative_check
  CHECK (price >= 0),
  ADD CONSTRAINT packages_duration_positive_check
  CHECK (duration_days > 0);

ALTER TABLE public.tools
  ADD CONSTRAINT tools_category_check
  CHECK (category IN ('umkm', 'freelancer', 'creator-seller')),
  ADD CONSTRAINT tools_status_check
  CHECK (status IN ('active', 'inactive'));
