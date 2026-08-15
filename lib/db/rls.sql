-- =============================================================
-- SiapinAja RLS (Backend_v3 §33-37, §8-11)
-- Apply after drizzle migration. Run: psql "$DATABASE_URL" -f lib/db/rls.sql
-- or via a helper script. Idempotent (drop policy if exists first).
-- =============================================================

-- --- helper: is the current user an admin? ---
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

-- =============================================================
-- profiles
-- =============================================================
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- auto-create profile on signup (Backend_v3 §4.1)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- packages (public read of active catalog, admin-only writes)
-- =============================================================
alter table public.packages enable row level security;

drop policy if exists "packages_select_active" on public.packages;
create policy "packages_select_active" on public.packages
  for select using (status = 'active');

drop policy if exists "packages_admin_write" on public.packages;
create policy "packages_admin_write" on public.packages
  for all using (public.is_admin())
  with check (public.is_admin());

-- =============================================================
-- tools (public read)
-- =============================================================
alter table public.tools enable row level security;

drop policy if exists "tools_select_active" on public.tools;
create policy "tools_select_active" on public.tools
  for select using (status = 'active');

drop policy if exists "tools_admin_write" on public.tools;
create policy "tools_admin_write" on public.tools
  for all using (public.is_admin())
  with check (public.is_admin());

-- =============================================================
-- package_tools (public read; admin-only writes)
-- =============================================================
alter table public.package_tools enable row level security;

drop policy if exists "package_tools_select" on public.package_tools;
create policy "package_tools_select" on public.package_tools
  for select using (true);

drop policy if exists "package_tools_admin_write" on public.package_tools;
create policy "package_tools_admin_write" on public.package_tools
  for all using (public.is_admin())
  with check (public.is_admin());

-- =============================================================
-- subscriptions (SELECT own only; mutations server/webhook/admin only)
-- =============================================================
alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (user_id = auth.uid());

drop policy if exists "subscriptions_admin_all" on public.subscriptions;
create policy "subscriptions_admin_all" on public.subscriptions
  for all using (public.is_admin())
  with check (public.is_admin());

-- =============================================================
-- payments (SELECT own only; INSERT/UPDATE server/webhook/admin only)
-- =============================================================
alter table public.payments enable row level security;

drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using (user_id = auth.uid());

drop policy if exists "payments_admin_all" on public.payments;
create policy "payments_admin_all" on public.payments
  for all using (public.is_admin())
  with check (public.is_admin());

-- =============================================================
-- webhook_events (no client access; trusted backend / admin only)
-- =============================================================
alter table public.webhook_events enable row level security;

drop policy if exists "webhook_events_admin_all" on public.webhook_events;
create policy "webhook_events_admin_all" on public.webhook_events
  for all using (public.is_admin())
  with check (public.is_admin());

-- =============================================================
-- admin_actions (no client access; trusted backend / admin only)
-- =============================================================
alter table public.admin_actions enable row level security;

drop policy if exists "admin_actions_admin_all" on public.admin_actions;
create policy "admin_actions_admin_all" on public.admin_actions
  for all using (public.is_admin())
  with check (public.is_admin());

-- =============================================================
-- user_roles (SELECT own; admin manages roles)
-- =============================================================
alter table public.user_roles enable row level security;

drop policy if exists "user_roles_select_own" on public.user_roles;
create policy "user_roles_select_own" on public.user_roles
  for select using (user_id = auth.uid());

drop policy if exists "user_roles_admin_all" on public.user_roles;
create policy "user_roles_admin_all" on public.user_roles
  for all using (public.is_admin())
  with check (public.is_admin());
