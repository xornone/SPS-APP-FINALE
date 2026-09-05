-- ============================================================================
-- SPS — lien cliquable optionnel pour le lieu de rendez-vous
-- A executer dans Supabase (SQL editor), APRES 0002_ride_comments.sql.
-- Le champ "place" reste le nom affiche (ex: "Parking de la Mairie,
-- Lattes") ; place_url est un lien optionnel (Google Maps, Waze, etc.) qui
-- rend ce nom cliquable sur la fiche sortie, sans rien changer d'autre.
-- ============================================================================

alter table public.rides
  add column if not exists place_url text;

comment on column public.rides.place_url is 'Lien optionnel vers le lieu de rendez-vous (Google Maps, Waze...) : rend le nom du lieu cliquable.';
