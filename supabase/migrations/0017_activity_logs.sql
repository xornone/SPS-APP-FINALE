-- ----------------------------------------------------------------------------
-- activity_logs : journal d'audit centralisé du club SPS.
-- Trace toutes les actions des administrateurs ET des membres sans compte
-- (inscriptions, désinscriptions, votes, commentaires, nominations de leader,
-- créations/modifications de sorties, envois de notifications).
-- ----------------------------------------------------------------------------

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Acteur
  actor_type text not null check (actor_type in ('admin', 'member')),
  actor_name text not null,
  actor_email text,
  actor_id uuid references auth.users(id) on delete set null,
  client_token text,

  -- Action et cible
  action text not null,
  target_type text not null,
  target_id text,
  target_title text,
  details jsonb not null default '{}'::jsonb,

  -- Réseau / Appareil
  ip_address text,
  user_agent text
);

comment on table public.activity_logs is 'Journal d''audit de l''application : traçabilité des actions admins et membres.';

-- Index pour des recherches rapides par date, membre, action ou cible
create index if not exists idx_activity_logs_created_at on public.activity_logs (created_at desc);
create index if not exists idx_activity_logs_actor_name on public.activity_logs (actor_name);
create index if not exists idx_activity_logs_action on public.activity_logs (action);
create index if not exists idx_activity_logs_target on public.activity_logs (target_type, target_id);
create index if not exists idx_activity_logs_client_token on public.activity_logs (client_token);

-- RLS : Sécurité stricte
alter table public.activity_logs enable row level security;

-- Seuls les administrateurs connectés peuvent lire le journal d'activité
create policy "activity_logs readable by admin" on public.activity_logs
  for select to authenticated
  using (public.is_admin());

-- Permissions : service_role peut tout faire, authenticated peut lire
grant select on public.activity_logs to authenticated;
grant all on public.activity_logs to service_role;
