-- La connexion Strava devient personnelle a l'admin connecte (avant :
-- n'importe quel admin partagerait la meme liste de comptes Strava connus,
-- visible et utilisable par tous). "drop if exists" est sans risque : la
-- table admin_strava_connections (migration 0007) ne contenait qu'une
-- connexion de test de Thomas, a reconnecter de toute facon.
drop table if exists admin_strava_connections;

-- Meme modele que "participations" : RLS activee SANS aucune policy (aucun
-- acces direct anon/authenticated) — toutes les lectures/ecritures passent
-- par le client service role (lib/supabase/admin.ts) depuis les routes
-- /api/admin/strava/*, qui n'agissent jamais que sur la ligne de l'admin
-- actuellement connecte (admin_user_id = l'id de sa propre session).
create table if not exists admin_strava_connections (
  admin_user_id uuid primary key references auth.users(id) on delete cascade,
  strava_athlete_id bigint not null,
  athlete_name text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table admin_strava_connections enable row level security;
