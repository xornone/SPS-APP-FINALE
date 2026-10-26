-- ============================================================================
-- SPS — Boîte à idées & suggestions interne (Avant-première Admin)
-- A exécuter dans l'éditeur SQL de votre tableau de bord Supabase si vous
-- souhaitez persister les idées dans Supabase pour tous les admins.
-- ============================================================================

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  category text not null default '💡 Idée / Suggestion',
  message text not null,
  author_name text not null default 'Membre SPS',
  is_anonymous boolean not null default false,
  email text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists suggestions_created_at_idx on public.suggestions (created_at desc);

-- RLS
alter table public.suggestions enable row level security;

-- Policies pour l'API
create policy "Allow select for all" on public.suggestions for select using (true);
create policy "Allow insert for all" on public.suggestions for insert with check (true);
create policy "Allow update for all" on public.suggestions for update using (true);
create policy "Allow delete for all" on public.suggestions for delete using (true);

grant all on public.suggestions to anon, authenticated;
