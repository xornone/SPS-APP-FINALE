-- ----------------------------------------------------------------------------
-- Empeche une meme personne (nom identique, insensible a la casse et aux
-- espaces) de s'inscrire deux fois a la meme sortie. Filet de securite en
-- base : l'API (app/api/participations) verifie deja ce cas et renvoie un
-- message clair, mais un index unique protege aussi contre une double
-- soumission simultanee (double clic, deux onglets, etc.).
-- ----------------------------------------------------------------------------
create unique index if not exists participations_unique_name_per_ride
  on public.participations (ride_id, lower(trim(participant_name)));
