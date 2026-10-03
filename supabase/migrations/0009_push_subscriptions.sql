-- ----------------------------------------------------------------------------
-- push_subscriptions : abonnements aux notifications push web, un par
-- navigateur/appareil ayant accepte de les recevoir. Aucun compte requis
-- (comme "participations") : on stocke juste l'abonnement PushSubscription
-- du navigateur (endpoint + cles de chiffrement). RLS activee SANS AUCUNE
-- POLICY, meme modele que "participations" : toutes les lectures/ecritures
-- passent par les routes API avec la cle service role (voir lib/webpush.ts
-- et app/api/push/*).
-- ----------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

comment on table public.push_subscriptions is 'Abonnements aux notifications push web (sans compte, un par navigateur).';

alter table public.push_subscriptions enable row level security;
