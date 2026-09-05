-- ----------------------------------------------------------------------------
-- Le club ne veut que les notifications "nouvelle sortie publiee" : on
-- retire les triggers "sortie modifiee" et "nouveau participant" mis en
-- place dans 0001_init.sql. Les anciennes notifications de ces types
-- restent visibles dans l'historique (colonne kind inchangee), seules les
-- nouvelles ne sont plus generees.
-- ----------------------------------------------------------------------------

drop trigger if exists rides_notify_updated on public.rides;
drop function if exists public.notify_ride_updated();

drop trigger if exists participations_notify on public.participations;
drop function if exists public.notify_new_participant();
