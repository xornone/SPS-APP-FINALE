import type { GroupLevel } from "./types";
import { extractCaptainFromDescription } from "./captain";

// Liste des membres administrateurs du club. Il n'existe pas de compte
// membre (voir supabase/migrations/0001_init.sql : toute session
// authentifiee EST admin) : cette liste sert uniquement a reperer, parmi
// les inscrits d'une sortie (un simple nom saisi librement), lesquels
// correspondent a un administrateur — pour en afficher le detail (nombre
// et groupe) aux autres admins sur l'onglet Accueil.
export const ADMIN_NAMES = [
  "Thomas Trégaro",
  "Duc Nguyen",
  "Huu Duc Nguyen",
  "Tanguy Delacôte",
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

/**
 * Retourne la liste des capitaines d'allure / encadrants d'une sortie :
 * - Les administrateurs inscrits (qui sont automatiquement capitaines de route)
 * - Les membres non-admins désignés capitaines dans la description de la sortie
 *
 * Ils sont tous représentés de la même manière dans l'onglet des sorties.
 */
export function getRegisteredCaptains(
  participants: { participant_name: string; group_level: GroupLevel }[],
  rideDescription?: string | null
): RegisteredAdmin[] {
  const result: RegisteredAdmin[] = [];
  const added = new Set<string>();

  // 1. Les admins inscrits dans un groupe
  for (const p of participants) {
    if (isAdminName(p.participant_name)) {
      result.push({ name: p.participant_name, group: p.group_level });
      added.add(normalize(p.participant_name));
    }
  }

  // 2. Les capitaines désignés dans la description (non-admins ou admins)
  const captainStr = extractCaptainFromDescription(rideDescription || "");
  if (captainStr) {
    const rawNames = captainStr.split(/[,;\/]+/).map((s) => s.trim()).filter(Boolean);
    for (const name of rawNames) {
      const norm = normalize(name);
      if (!added.has(norm)) {
        const found = participants.find((p) => normalize(p.participant_name) === norm);
        if (found) {
          result.push({ name: found.participant_name, group: found.group_level });
        } else {
          result.push({ name, group: "vert" });
        }
        added.add(norm);
      }
    }
  }

  return result;
}

/**
 * Parmi les inscrits d'une sortie, ceux qui correspondent à un admin ou capitaine d'allure.
 */
export function getRegisteredAdmins(
  participants: { participant_name: string; group_level: GroupLevel }[],
  rideDescription?: string | null
): RegisteredAdmin[] {
  if (rideDescription) {
    return getRegisteredCaptains(participants, rideDescription);
  }
  return participants
    .filter((p) => isAdminName(p.participant_name))
    .map((p) => ({ name: p.participant_name, group: p.group_level }));
}

/** Parmi les groupes de niveau proposes sur une sortie, ceux ou aucun admin
 * ou capitaine n'est inscrit — pour alerter les autres admins qu'il faudra en trouver un. */
export function getMissingAdminGroups(
  rideGroups: GroupLevel[],
  registeredAdmins: RegisteredAdmin[]
): GroupLevel[] {
  const coveredGroups = new Set(registeredAdmins.map((a) => a.group));
  return rideGroups.filter((g) => !coveredGroups.has(g));
}
