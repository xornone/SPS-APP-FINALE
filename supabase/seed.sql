-- ============================================================================
-- Donnees de demarrage optionnelles — a executer APRES 0001_init.sql.
-- Aucune inscription n'est seedee ici : les participations se creent depuis
-- l'app (nom + groupe, sans compte).
-- ============================================================================

insert into public.rides (title, description, ride_date, ride_time, place, distance_km, elevation_gain_m)
values
  ('Sortie café – Lattes / Palavas', 'Balade tranquille en bord de mer jusqu''à Palavas-les-Flots avec pause café.', current_date + 1, '08:00', 'Parking de la Mairie, Lattes', 42, 120),
  ('Sortie dimanche – Pic Saint-Loup', 'La classique du club : direction le Pic Saint-Loup par les petites routes des contreforts cévenols.', current_date + 2, '08:30', 'Parking du stade, Saint-Clément-de-Rivière', 82, 850),
  ('Grand tour du Salagou', 'Sortie exigeante autour du lac du Salagou et des ruffes volcaniques.', current_date + 8, '07:30', 'Parking du lac, Clermont-l''Hérault', 108, 1450)
on conflict do nothing;

insert into public.ride_groups (ride_id, group_level, target_speed)
select id, g.group_level, g.target_speed
from public.rides r
cross join (values
  ('vert', '24–26 km/h'),
  ('rouge', '26–27 km/h')
) as g(group_level, target_speed)
where r.title = 'Sortie café – Lattes / Palavas'
on conflict do nothing;

insert into public.ride_groups (ride_id, group_level, target_speed)
select id, g.group_level, g.target_speed
from public.rides r
cross join (values
  ('vert', '24–26 km/h'),
  ('rouge', '26–27 km/h'),
  ('violet', '28+ km/h')
) as g(group_level, target_speed)
where r.title = 'Sortie dimanche – Pic Saint-Loup'
on conflict do nothing;

insert into public.ride_groups (ride_id, group_level, target_speed)
select id, g.group_level, g.target_speed
from public.rides r
cross join (values
  ('rouge', '26–27 km/h'),
  ('violet', '28+ km/h')
) as g(group_level, target_speed)
where r.title = 'Grand tour du Salagou'
on conflict do nothing;

-- Pour creer ton compte administrateur (le seul compte de l'app), depuis le
-- dashboard Supabase : Authentication > Users > Invite user, avec ton
-- email. Tu recevras un email d'invitation qui te connecte directement.
-- Assure-toi que "Allow new users to sign up" reste desactive
-- (Authentication > Providers > Email) pour que personne d'autre ne puisse
-- s'auto-inviter comme administrateur.
