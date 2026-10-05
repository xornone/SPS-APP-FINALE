-- ============================================================================
-- SPS — consignes de sécurité optionnelles par sortie
-- A executer dans Supabase (SQL editor), APRES 0009_push_subscriptions.sql.
-- Jusqu'ici les consignes fixes ("Si ton niveau n'est pas adapte...",
-- equipement obligatoire, etc.) etaient affichees sur TOUTES les sorties.
-- Cette colonne permet a l'admin de les afficher ou non, sortie par sortie.
-- Defaut true : les sorties existantes gardent exactement le meme affichage.
-- ============================================================================

alter table public.rides
  add column if not exists show_safety_notice boolean not null default true;

comment on column public.rides.show_safety_notice is 'Affiche (true) ou masque (false) le bloc de consignes de securite fixes sous la description de la sortie.';
