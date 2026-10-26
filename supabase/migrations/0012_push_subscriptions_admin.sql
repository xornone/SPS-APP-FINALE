-- ----------------------------------------------------------------------------
-- push_subscriptions : ajout de la colonne is_admin pour cibler les
-- notifications reservees aux administrateurs (ex : boite a idees).
-- ----------------------------------------------------------------------------
alter table public.push_subscriptions
add column if not exists is_admin boolean not null default false;

create index if not exists idx_push_subscriptions_is_admin
on public.push_subscriptions (is_admin)
where is_admin = true;
