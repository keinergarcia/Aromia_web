-- ============================================================================
-- AROMIA Web — Fase 2, E1 (Licenciamiento)
-- Tabla: admin_users + helper authorize('admin')
--
-- Fuente de verdad de quién es administrador. Un Custom Access Token Hook
-- (fase posterior) inyectará app_metadata.role='admin' en el JWT a partir de
-- esta tabla; aquí se define la verificación server-side en BD para las
-- operaciones sensibles (D3: hook para rendimiento + verificación en BD).
-- ============================================================================

create table if not exists public.admin_users (
  id         uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- ---------------------------------------------------------------------------
-- Verificación de rol (server-side, Edge Functions con secret key).
-- Devuelve true si el usuario indicado pertenece a admin_users.
-- NOTA: invocable solo con el rol correcto; nunca expone la tabla al cliente.
-- ---------------------------------------------------------------------------
create or replace function public.authorize(required_role text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select
    case lower(required_role)
      when 'admin' then
        exists (select 1 from public.admin_users au where au.id = auth.uid())
      else false
    end;
$$;

-- La tabla admin_users se administra exclusivamente por un superuser/Edge
-- Function con secret key (no hay policies de admin embebidas). Sin grants a
-- anon/authenticated.