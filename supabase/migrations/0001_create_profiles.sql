-- ============================================================================
-- AROMIA Web — Fase 1
-- Tabla: profiles
--
-- Única tabla adicional en esta fase. Ancla de identidad que extiende
-- auth.users (que no debe modificarse) con datos no sensibles del perfil.
-- Referencia a auth.users(id) => pivote de futuras entidades de licencias.
--
-- NOTA: No se crean tablas de licencias/devices/customers/admin/app_versions
-- en esta fase (pertenecen a fases posteriores y quedarían sin uso).
-- ============================================================================

create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  email          text not null,
  full_name      text,
  account_status text not null default 'active',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS: cada usuario solo puede consultar/modificar su propio perfil.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "select_own_profile" on public.profiles;
create policy "select_own_profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "insert_own_profile" on public.profiles;
create policy "insert_own_profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "update_own_profile" on public.profiles;
create policy "update_own_profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Sin grants para anon (nada de perfiles es público).

-- ---------------------------------------------------------------------------
-- Trigger: crear el perfil automáticamente al registrarse el usuario.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Timestamp de actualización automática de updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();