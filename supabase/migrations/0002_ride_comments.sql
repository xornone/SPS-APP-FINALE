-- ============================================================================
-- SPS — espace de discussion sous chaque sortie
-- A executer dans Supabase (SQL editor), APRES 0001_init.sql.
-- Meme principe que les participations : pas de compte, juste un nom donne
-- au moment du message. Un jeton (client_token) est renvoye au navigateur
-- pour permettre de supprimer son propre message plus tard ; il n'est
-- jamais expose en lecture publique (voir la vue ride_comment_feed).
-- ============================================================================

create table if not exists public.ride_comments (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides (id) on delete cascade,
  author_name text not null,
  message text not null,
  client_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

comment on table public.ride_comments is 'Messages laisses sous une sortie (sans compte) : nom + message + jeton de suppression local.';

create index if not exists ride_comments_ride_id_idx on public.ride_comments (ride_id, created_at);

-- Vue publique des messages, sans le client_token : c'est celle-ci que
-- l'app lit pour afficher la discussion. La table elle-meme n'est jamais
-- lue directement par le client (voir RLS plus bas).
create or replace view public.ride_comment_feed as
  select id, ride_id, author_name, message, created_at
  from public.ride_comments;

-- RLS : aucune policy anon/authenticated -> table fermee en acces direct
-- (deny by default). Lecture publique via la vue ; ecritures (creation,
-- suppression) via les routes API serveur (/api/comments) avec la cle
-- service role, qui verifie elle-meme le client_token avant de supprimer.
alter table public.ride_comments enable row level security;

-- Grant de base sur la vue : necessaire en plus de RLS si le projet a ete
-- cree avec "Automatically expose new tables" decoche (voir 0001_init.sql
-- pour le detail de pourquoi ce grant est indispensable).
grant select on public.ride_comment_feed to anon, authenticated;
