-- ----------------------------------------------------------------------------
-- Le club n'a pas besoin de la fonctionnalite "Activite / notifications" :
-- on retire entierement les triggers, fonctions et la table mis en place
-- dans 0001_init.sql (le "petit cloche" de l'app est aussi retire cote code).
-- ----------------------------------------------------------------------------

drop trigger if exists rides_notify_created on public.rides;
drop function if exists public.notify_ride_created();

drop trigger if exists rides_notify_updated on public.rides;
drop function if exists public.notify_ride_updated();

drop trigger if exists participations_notify on public.participations;
drop function if exists public.notify_new_participant();

drop table if exists public.notifications;
