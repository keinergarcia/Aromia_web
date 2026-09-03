-- ============================================================================
-- AROMIA Web — Fase 2, E1 (Licenciamiento)
-- Tabla: license_activations
--
-- Relación licencia ↔ dispositivo: cada fila representa un slot de activación.
-- El conteo de slots activos se mantiene en licenses.activation_count
-- (server-side), nunca por el cliente. Solo el servidor inserta/actualiza.
-- ============================================================================

create table if not exists public.license_activations (
  id               uuid primary key default gen_random_uuid(),
  license_id       uuid not null references public.licenses (id) on delete cascade,
  device_id        uuid not null references public.devices (id) on delete cascade,
  status           text not null default 'active',
  activated_at     timestamptz not null default now(),
  last_validated_at timestamptz,
  deactivated_at   timestamptz,

  constraint license_activations_license_device_unique unique (license_id, device_id),
  constraint license_activations_status_check check (status in ('active', 'inactive', 'revoked'))
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index if not exists idx_license_activations_license_status on public.license_activations (license_id, status);

-- ---------------------------------------------------------------------------
-- RLS: sin acceso directo para clientes/anon; solo vía servidor.
-- ---------------------------------------------------------------------------
alter table public.license_activations enable row level security;