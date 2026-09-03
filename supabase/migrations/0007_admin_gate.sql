-- ============================================================================
-- AROMIA Web — Fase 2, E6 (Panel admin). Migración 0007
--
-- Gate administrativo con verificación en BD (D3 sin hook JWT todavía):
--   - public.is_admin()    : RPC pública para el frontend /admin (security definer).
--   - public.authorize()   : corregido a SECURITY DEFINER. La versión anterior
--                            (security invoker) NO funcionaría como policy de RLS
--                            porque una consulta a admin_users desde invoker está
--                            bloqueada por la propia RLS de esa tabla.
--   - Policies de lectura admin sobre las tablas sensibles (solo SELECT, vía
--     authorize('admin')). Las escrituras SIEMPRE van por Edge Function.
--
-- ADITIVA e idempotente. No toca profiles (Fase 1 intacta).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. authorize(required_role): verificación de rol en BD (security definer).
--    El propietario (postgres) salta RLS al leer admin_users.
-- ---------------------------------------------------------------------------
create or replace function public.authorize(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case lower(required_role)
      when 'admin' then
        exists (select 1 from public.admin_users au where au.id = auth.uid())
      else false
    end;
$$;

-- Para poder invocarla desde una policy de RLS, el rol authenticated necesita
-- EXECUTE sobre la función.
grant execute on function public.authorize(text) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- 2. is_admin(): RPC para que el frontend sepa si la sesión tiene rol admin.
--    Devuelve true/false; no expone filas de admin_users.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users au where au.id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Policies de LECTURA admin (solo select) sobre las tablas sensibles.
--    Un admin puede listar/buscar; nunca editar directamente desde el navegador
--    (las escrituras van por Edge Function con secret key).
-- ---------------------------------------------------------------------------
drop policy if exists "admin_select_licenses" on public.licenses;
create policy "admin_select_licenses"
  on public.licenses for select
  to authenticated
  using (public.authorize('admin'));

drop policy if exists "admin_select_devices" on public.devices;
create policy "admin_select_devices"
  on public.devices for select
  to authenticated
  using (public.authorize('admin'));

drop policy if exists "admin_select_license_activations" on public.license_activations;
create policy "admin_select_license_activations"
  on public.license_activations for select
  to authenticated
  using (public.authorize('admin'));

drop policy if exists "admin_select_admin_users" on public.admin_users;
create policy "admin_select_admin_users"
  on public.admin_users for select
  to authenticated
  using (public.authorize('admin'));