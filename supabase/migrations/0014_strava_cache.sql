-- Migration 0014 : Cache persistant des statistiques Strava des membres SPS
-- Permet de partager les classements Strava entre toutes les instances serverless Vercel
create table if not exists strava_cache (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Active le Row Level Security
alter table strava_cache enable row level security;

-- Lecture publique pour tout le monde (pour afficher le classement sur /classement)
create policy "strava_cache_select_public"
  on strava_cache for select
  using (true);

-- Écriture autorisée pour l'insertion et la mise à jour (client public anon et service role)
create policy "strava_cache_insert_public"
  on strava_cache for insert
  with check (true);

create policy "strava_cache_update_public"
  on strava_cache for update
  using (true)
  with check (true);
