-- ============================================================================
-- AROMIA Web — Fase 2, E1 (Licenciamiento)
-- Tabla: app_versions (publicación de versiones del Desktop)
--
-- D6 aprobado: tabla pública, no constante. La Edge Function get-latest-version
-- la lee para informar al Desktop de la versión vigente y los rangos de
-- compatibilidad. Lectura pública (solo select), escritura solo servidor/admin.
-- ============================================================================

create table if not exists public.app_versions (
  id           uuid primary key default gen_random_uuid(),
  version      text not null,
  url          text,
  min_app_version text,
  release_notes text,
  is_current   boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists idx_app_versions_current on public.app_versions (is_current) where is_current;

-- ---------------------------------------------------------------------------
-- RLS: lectura pública de la versión vigente; escritura solo vía servidor.
-- ---------------------------------------------------------------------------
alter table public.app_versions enable row level security;

drop policy if exists "app_versions_select_public" on public.app_versions;
create policy "app_versions_select_public"
  on public.app_versions for select
  to anon, authenticated
  using (true);

-- Sin policies de insert/update/delete: lo administra el servidor con secret key.