-- ============================================================================
-- SPS — Sondages du Club (Choix unique ou multiple, votes par Prénom + Nom)
-- ============================================================================

-- Table des sondages
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  description text,
  allow_multiple boolean not null default false,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  created_by text
);

create index if not exists polls_created_at_idx on public.polls (created_at desc);

-- Table des options de vote
create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  title text not null,
  position int not null default 0
);

create index if not exists poll_options_poll_idx on public.poll_options (poll_id, position asc);

-- Table des votes enregistrés
create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  voter_name text not null,
  voter_token text not null,
  created_at timestamptz not null default now()
);

create index if not exists poll_votes_poll_idx on public.poll_votes (poll_id);
create index if not exists poll_votes_voter_idx on public.poll_votes (voter_token, voter_name);
create unique index if not exists poll_votes_unique_idx on public.poll_votes (poll_id, voter_token, option_id);

-- RLS
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

-- Policies pour anon/authenticated
create policy "Allow select for all on polls" on public.polls for select using (true);
create policy "Allow insert for all on polls" on public.polls for insert with check (true);
create policy "Allow update for all on polls" on public.polls for update using (true);
create policy "Allow delete for all on polls" on public.polls for delete using (true);

create policy "Allow select for all on poll_options" on public.poll_options for select using (true);
create policy "Allow insert for all on poll_options" on public.poll_options for insert with check (true);
create policy "Allow update for all on poll_options" on public.poll_options for update using (true);
create policy "Allow delete for all on poll_options" on public.poll_options for delete using (true);

create policy "Allow select for all on poll_votes" on public.poll_votes for select using (true);
create policy "Allow insert for all on poll_votes" on public.poll_votes for insert with check (true);
create policy "Allow update for all on poll_votes" on public.poll_votes for update using (true);
create policy "Allow delete for all on poll_votes" on public.poll_votes for delete using (true);

grant all on public.polls to anon, authenticated;
grant all on public.poll_options to anon, authenticated;
grant all on public.poll_votes to anon, authenticated;
