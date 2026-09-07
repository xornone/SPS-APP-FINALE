-- Table experimentale pour la page de test /admin2test : jetons Strava des
-- admins qui testent l'import automatique du trace GPX depuis un lien
-- Strava (voir lib/stravaTest.ts). Meme modele que "participations" : RLS
-- activee SANS aucune policy (aucun acces direct anon/authenticated) —
-- toutes les lectures/ecritures passent par le client service role
-- (lib/supabase/admin.ts) depuis les routes /api/admin2test/strava/*.
create table if not exists admin_strava_test_connections (
  admin_name text primary key,
  strava_athlete_id bigint,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table admin_strava_test_connections enable row level security;
