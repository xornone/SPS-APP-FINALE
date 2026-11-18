-- ============================================================================
-- SPS — Ajout de la photo de contexte pour les sondages
-- ============================================================================

alter table public.polls add column if not exists image_url text;

comment on column public.polls.image_url is 'Photo ou illustration facultative attachée au contexte du sondage (Data URL ou lien)';
