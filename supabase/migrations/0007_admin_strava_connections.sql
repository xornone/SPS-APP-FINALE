-- Remplace admin_strava_test_connections (migration 0006, page de test
-- /admin2test, abandonnee) : l'import automatique du trace GPX depuis
-- Strava passe directement dans /admin, ouvert a tous les admins (plus
-- seulement Duc et Aymeric) — chaque connexion Strava est desormais
-- identifiee par l'ID Strava de l'athlete (retourne par Strava a la
-- connexion), pas par un nom d'admin fixe. "drop if exists" est sans risque
-- : aucune connexion reelle n'a encore ete enregistree dans l'ancienne table.
drop table if exists admin_strava_test_connections;

-- Meme modele que "participations" : RLS activee SANS aucune policy (aucun
-- acces direct anon/authenticated) — toutes les lectures/ecritures passent
-- par le client service role (lib/supabase/admin.ts) depuis les routes
-- /api/admin/strava/*.
create table if not exists admin_strava_connections (
  strava_athlete_id bigint primary key,
  athlete_name text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table admin_strava_connections enable row level security;
