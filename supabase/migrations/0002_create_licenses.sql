-- ============================================================================
-- AROMIA Web — Fase 2, E1 (Licenciamiento)
-- Tabla: licenses
--
-- Entidad central del sistema de licencias de AROMIA Desktop. Solo el servidor
-- (Edge Function con secret key) inserta/actualiza; el cliente normal NO tiene
-- acceso directo vía RLS (accede exclusivamente a través de Edge Functions).
-- Se guarda SOLO el hash SHA-256 del license_key; la clave en claro se entrega
-- al momento de crear la licencia y no se persiste.
--
-- ADITIVA: no altera profiles ni sus políticas de Fase 1.
-- ============================================================================

create table if not exists public.licenses (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references public.profiles (id) on delete cascade,
  license_key       text not null unique,
  license_key_hash  text not null unique,
  product           text not null default 'AROMIA',
  plan              text not null,
  status            text not null default 'active',
  max_activations   int  not null default 1,
  issued_at         timestamptz not null default now(),
  expires_at        timestamptz,
  min_app_version   text,
  max_app_version   text,
  activated_at      timestamptz,
  last_validated_at timestamptz,
  activation_count  int  not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint licenses_plan_check        check (plan in ('perpetual', 'annual')),
  constraint licenses_status_check      check (status in ('active', 'suspended', 'expired', 'revoked', 'pending')),
  constraint licenses_max_activations_check check (max_activations >= 1)
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index if not exists idx_licenses_customer_id on public.licenses (customer_id);
create index if not exists idx_licenses_status     on public.licenses (status);

-- ---------------------------------------------------------------------------
-- RLS: sin acceso directo para clientes/anon; solo administración vía servidor.
-- ---------------------------------------------------------------------------
alter table public.licenses enable row level security;

-- El cliente normal no recibe policies de select/insert/update/delete sobre
-- licenses: lee y opera exclusivamente vía Edge Functions autorizadas.
-- El admin gestiona a través del rol `admin` (ver migrate 0005, authorize()).

-- ---------------------------------------------------------------------------
-- Trigger: updated_at automático (misma función que Fase 1).
-- ---------------------------------------------------------------------------
drop trigger if exists set_licenses_updated_at on public.licenses;
create trigger set_licenses_updated_at
  before update on public.licenses
  for each row execute function public.set_updated_at();