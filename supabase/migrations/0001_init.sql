-- ============================================================================
-- SPS (Solo Plus Solo) — schema initial
-- A executer dans Supabase (SQL editor) sur un projet neuf.
--
-- Modele d'acces : un seul type de compte existe (l'administrateur du club),
-- cree par invitation depuis le dashboard Supabase (Authentication > Users >
-- Invite user) — l'inscription publique doit rester desactivee
-- (Authentication > Providers > Email > "Allow new users to sign up" = off).
-- Consequence : toute session authentifiee EST un administrateur, il n'y a
-- pas de table de roles a maintenir. Les membres du club, eux, n'ont pas de
-- compte : ils s'inscrivent a une sortie avec juste leur nom (voir
-- "participations" plus bas).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- rides : les sorties du club
-- ----------------------------------------------------------------------------
create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  ride_date date not null,
  ride_time time not null,
  place text not null,
  distance_km numeric(6, 1) not null,
  elevation_gain_m integer not null,
  strava_url text,                   -- lien vers la trace publiee sur Strava (optionnel)
  gpx_path text,                     -- chemin dans le bucket Storage "gpx"
  route_points jsonb,                -- trace parsee depuis le GPX : [[lat, lon], ...]
  route_elevations jsonb,            -- profil d'altitude : [ele_m, ...] (meme longueur que route_points)
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.rides is 'Sorties SPS, passees et a venir.';

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rides_set_updated_at on public.rides;
create trigger rides_set_updated_at
  before update on public.rides
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- ride_groups : groupes d'allure proposes pour une sortie donnee
-- ----------------------------------------------------------------------------
create table if not exists public.ride_groups (
  ride_id uuid not null references public.rides (id) on delete cascade,
  group_level text not null check (group_level in ('vert', 'rouge', 'violet')),
  target_speed text not null,
  primary key (ride_id, group_level)
);

-- ----------------------------------------------------------------------------
-- participations : inscriptions aux sorties, sans compte membre.
-- Chacun donne juste son nom ; un jeton (client_token) genere au moment de
-- l'inscription est renvoye au navigateur (jamais expose en lecture publique,
-- voir la vue ride_participants plus bas) et permet de retirer sa propre
-- inscription plus tard depuis le meme navigateur. L'admin peut toujours
-- retirer n'importe quelle inscription depuis l'espace d'administration.
-- ----------------------------------------------------------------------------
create table if not exists public.participations (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides (id) on delete cascade,
  participant_name text not null,
  group_level text not null check (group_level in ('vert', 'rouge', 'violet')),
  client_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

comment on table public.participations is 'Inscriptions aux sorties (sans compte) : nom + groupe + jeton de retrait local.';

-- Vue publique des participations, sans le client_token : c'est celle-ci que
-- l'app lit pour afficher qui participe. La table elle-meme n'est jamais
-- lue directement par le client (voir RLS plus bas).
create or replace view public.ride_participants as
  select id, ride_id, participant_name, group_level, created_at
  from public.participations;

-- ----------------------------------------------------------------------------
-- notifications : flux "Activite SPS", public (alimente par triggers)
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('ride_created', 'ride_updated', 'ride_cancelled', 'new_participant')),
  ride_id uuid references public.rides (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create or replace function public.notify_ride_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (kind, ride_id, message)
  values ('ride_created', new.id, 'Nouvelle sortie publiee : ' || new.title);
  return new;
end;
$$;

drop trigger if exists rides_notify_created on public.rides;
create trigger rides_notify_created
  after insert on public.rides
  for each row execute procedure public.notify_ride_created();

create or replace function public.notify_ride_updated()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (old.ride_date, old.ride_time, old.place, old.distance_km, old.elevation_gain_m, old.gpx_path)
     is distinct from
     (new.ride_date, new.ride_time, new.place, new.distance_km, new.elevation_gain_m, new.gpx_path) then
    insert into public.notifications (kind, ride_id, message)
    values ('ride_updated', new.id, 'Sortie modifiee : ' || new.title);
  end if;
  return new;
end;
$$;

drop trigger if exists rides_notify_updated on public.rides;
create trigger rides_notify_updated
  after update on public.rides
  for each row execute procedure public.notify_ride_updated();

create or replace function public.notify_new_participant()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ride_title text;
begin
  select title into ride_title from public.rides where id = new.ride_id;
  insert into public.notifications (kind, ride_id, message)
  values ('new_participant', new.ride_id, new.participant_name || ' participe a : ' || coalesce(ride_title, 'une sortie'));
  return new;
end;
$$;

drop trigger if exists participations_notify on public.participations;
create trigger participations_notify
  after insert on public.participations
  for each row execute procedure public.notify_new_participant();

-- ----------------------------------------------------------------------------
-- Helper : l'utilisateur courant est-il administrateur ?
-- Toute session authentifiee EST administrateur (voir note en tete de
-- fichier) : l'inscription publique doit rester desactivee cote Supabase.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select auth.uid() is not null;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.rides enable row level security;
alter table public.ride_groups enable row level security;
alter table public.participations enable row level security;
alter table public.notifications enable row level security;

-- rides : lisibles par tout le monde (l'app est publique cote membres)
create policy "rides readable by anyone" on public.rides
  for select using (true);

-- rides : creation / modification / suppression reservees a l'admin
create policy "rides writable by admin" on public.rides
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ride_groups : memes regles que rides
create policy "ride_groups readable by anyone" on public.ride_groups
  for select using (true);

create policy "ride_groups writable by admin" on public.ride_groups
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- participations : AUCUNE policy anon/authenticated -> table totalement
-- fermee en acces direct (RLS activee, zero regle = deny by default). Les
-- lectures publiques passent par la vue ride_participants (qui ne montre
-- pas client_token) ; les ecritures (creation, retrait) passent par les
-- routes API serveur (/api/participations) via la cle service role, qui
-- contourne RLS apres avoir verifie elle-meme le client_token.
grant select on public.ride_participants to anon, authenticated;

-- notifications : flux public, lecture seule cote client
create policy "notifications readable by anyone" on public.notifications
  for select using (true);

-- ----------------------------------------------------------------------------
-- Grants de base : necessaires en plus des policies RLS ci-dessus. Si le
-- projet Supabase a ete cree avec "Automatically expose new tables"
-- decoche (recommande), anon/authenticated n'ont par defaut AUCUN droit sur
-- les nouvelles tables -> sans ces grants, meme une policy RLS "using (true)"
-- echoue avec une erreur 42501 (permission denied), car le refus au niveau
-- table est verifie avant les policies RLS.
-- ----------------------------------------------------------------------------
grant select on public.rides, public.ride_groups, public.notifications to anon, authenticated;
grant insert, update, delete on public.rides, public.ride_groups to authenticated;

-- ============================================================================
-- Storage : bucket pour les fichiers GPX
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('gpx', 'gpx', true)
on conflict (id) do nothing;

-- lecture publique des GPX (telechargement direct depuis l'app)
create policy "gpx public read" on storage.objects
  for select using (bucket_id = 'gpx');

-- upload/replace/suppression reserves a l'admin (les ecritures passent
-- normalement par la route API serveur avec la service role key, qui
-- bypass RLS de toute facon ; cette policy couvre aussi un eventuel appel
-- client direct)
create policy "gpx admin write" on storage.objects
  for insert to authenticated with check (bucket_id = 'gpx' and public.is_admin());

create policy "gpx admin update" on storage.objects
  for update to authenticated using (bucket_id = 'gpx' and public.is_admin());

create policy "gpx admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'gpx' and public.is_admin());
