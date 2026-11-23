-- ----------------------------------------------------------------------------
-- push_subscriptions : association d'un appareil au nom du membre SPS
-- pour le ciblage des rappels automatiques la veille de sortie par groupe.
-- ----------------------------------------------------------------------------
alter table public.push_subscriptions
add column if not exists participant_name text;

create index if not exists idx_push_subscriptions_participant_name
on public.push_subscriptions (participant_name);
