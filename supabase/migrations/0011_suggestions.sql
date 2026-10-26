-- ============================================================================
-- SPS — Boîte à idées & suggestions interne (sans e-mail)
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

-- RLS activée : accès contrôlé par les API serveur
alter table public.suggestions enable row level security;
