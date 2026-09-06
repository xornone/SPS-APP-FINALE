import type { GroupLevel } from "./types";

// Liste des membres administrateurs du club. Il n'existe pas de compte
// membre (voir supabase/migrations/0001_init.sql : toute session
// authentifiee EST admin) : cette liste sert uniquement a reperer, parmi
// les inscrits d'une sortie (un simple nom saisi librement), lesquels
// correspondent a un administrateur — pour en afficher le detail (nombre
// et groupe) aux autres admins sur l'onglet Accueil.
export const ADMIN_NAMES = [
  "Thomas Trégaro",
  "Duc Nguyen",
  "Tanguy Delacôte",
  "Margaux Dirat",
  "Aymeric Closier",
  "Franck Georges",
  "Martin Lemmens",
];

// Comparaison tolerante a la casse et aux accents, puisque le nom d'un
// participant est saisi librement (pas de compte, pas de liste deroulante).
function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const NORMALIZED_ADMIN_NAMES = new Set(ADMIN_NAMES.map(normalize));

export function isAdminName(name: string): boolean {
  return NORMALIZED_ADMIN_NAMES.has(normalize(name));
}

export interface RegisteredAdmin {
  name: string;
  group: GroupLevel;
}

/** Parmi les inscrits d'une sortie, ceux qui correspondent a un admin — avec leur groupe. */
export function getRegisteredAdmins(
  participants: { participant_name: string; group_level: GroupLevel }[]
): RegisteredAdmin[] {
  return participants
    .filter((p) => isAdminName(p.participant_name))
    .map((p) => ({ name: p.participant_name, group: p.group_level }));
}

/** Parmi les groupes de niveau proposes sur une sortie, ceux ou aucun admin
 * n'est inscrit — pour alerter les autres admins qu'il faudra en trouver un
 * (encadrement du groupe). */
export function getMissingAdminGroups(
  rideGroups: GroupLevel[],
  registeredAdmins: RegisteredAdmin[]
): GroupLevel[] {
  const coveredGroups = new Set(registeredAdmins.map((a) => a.group));
  return rideGroups.filter((g) => !coveredGroups.has(g));
}
