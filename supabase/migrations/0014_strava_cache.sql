-- Migration 0014 : Cache persistant des statistiques Strava des membres SPS
-- Permet de partager les classements Strava entre toutes les instances serverless Vercel
create table if not exists public.strava_cache (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Permissions de table pour tous les rôles Supabase
grant all on public.strava_cache to anon, authenticated, service_role;

-- Active le Row Level Security
alter table public.strava_cache enable row level security;

-- Policies pour lecture et écriture publiques (client public anon et service role)
drop policy if exists "strava_cache_select_public" on public.strava_cache;
create policy "strava_cache_select_public"
  on public.strava_cache for select
  using (true);

drop policy if exists "strava_cache_insert_public" on public.strava_cache;
create policy "strava_cache_insert_public"
  on public.strava_cache for insert
  with check (true);

drop policy if exists "strava_cache_update_public" on public.strava_cache;
create policy "strava_cache_update_public"
  on public.strava_cache for update
  using (true)
  with check (true);
