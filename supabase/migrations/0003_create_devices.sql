-- ============================================================================
-- AROMIA Web — Fase 2, E1 (Licenciamiento)
-- Tabla: devices
--
-- Dispositivos (PCs) que activan una licencia. Solo se almacena el hash
-- SHA-256 del fingerprint; nunca el hardware crudo.
-- El cliente normal NO tiene RLS directo: todo el acceso pasa por Edge Functions.
-- ============================================================================

create table if not exists public.devices (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  fingerprint text not null,
  device_name text,
  os          text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint devices_customer_fingerprint_unique unique (customer_id, fingerprint)
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index if not exists idx_devices_fingerprint on public.devices (fingerprint);

-- ---------------------------------------------------------------------------
-- RLS: sin acceso directo para clientes/anon; solo vía servidor.
-- ---------------------------------------------------------------------------
alter table public.devices enable row level security;

-- ---------------------------------------------------------------------------
-- Trigger: updated_at automático.
-- ---------------------------------------------------------------------------
drop trigger if exists set_devices_updated_at on public.devices;
create trigger set_devices_updated_at
  before update on public.devices
  for each row execute function public.set_updated_at();