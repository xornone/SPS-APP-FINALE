import type { GroupLevel, Participation } from "./types";
import {
  SPS_ACTIVE_MEMBERS,
  findOfficialMember,
  stripEmojiAndDiacritics,
} from "./members";

export interface AssiduityEntry {
  display: string;
  count: number;
  groups: Record<GroupLevel, number>;
}

export type AssiduityInputItem =
  | string
  | {
      participant_name?: string | null;
      name?: string | null;
      group_level?: GroupLevel | string | null;
      group?: GroupLevel | string | null;
    };

/**
 * Normalise un nom pour regrouper les variantes d'orthographe (casse, accents, emojis, ordre des mots).
 */
export function normalizeMemberName(name: string): string {
  const cleaned = stripEmojiAndDiacritics(name).trim().replace(/\s+/g, " ").toLowerCase();
  return cleaned.split(" ").filter(Boolean).sort().join(" ");
}

/**
 * Construit le classement complet d'assiduité basé sur la LISTE TOTALE DES MEMBRES ACTIFS.
 * - Fait coïncider les pseudonymes et variantes de saisie des participants dans l'app
 *   avec les noms officiels des membres abonnés (ex: "Ben Horny" -> Ben Horny : 10 sorties,
 *   "Duc Nguyen" -> Huu Duc Nguyen, "MIMOUNI redouane ✌" -> Redouane Mimouni, etc.).
 * - Comptabilise également le nombre de participations par groupe de niveau (vert, rouge, violet).
 * - Attribue 0 sortie aux membres qui ne sont jamais encore venus.
 * - Trie par nombre de sorties décroissant, puis par ordre alphabétique.
 */
export function buildAssiduityRanking(items: AssiduityInputItem[], limit?: number): AssiduityEntry[] {
  // Initialisation de tous les membres officiels avec 0 sortie et 0 par groupe
  const countsByMember = new Map<string, number>();
  const groupsByMember = new Map<string, Record<GroupLevel, number>>();
  for (const member of SPS_ACTIVE_MEMBERS) {
    countsByMember.set(member, 0);
    groupsByMember.set(member, { vert: 0, rouge: 0, violet: 0 });
  }

  // Incrément des sorties pour chaque participation réconciliée
  for (const item of items) {
    if (!item) continue;
    const raw = typeof item === "string" ? item : (item.participant_name ?? item.name ?? "");
    if (!raw) continue;
    const official = findOfficialMember(raw);
    if (official) {
      countsByMember.set(official, (countsByMember.get(official) || 0) + 1);

      const groupRaw = typeof item === "object" ? (item.group_level ?? item.group) : null;
      const normalizedGroup = typeof groupRaw === "string" ? groupRaw.toLowerCase().trim() : "";
      if (normalizedGroup === "vert" || normalizedGroup === "rouge" || normalizedGroup === "violet") {
        const memberGroups = groupsByMember.get(official);
        if (memberGroups) {
          memberGroups[normalizedGroup as GroupLevel]++;
        }
      }
    }
  }

  const entries: AssiduityEntry[] = Array.from(countsByMember.entries()).map(
    ([display, count]) => ({
      display,
      count,
      groups: groupsByMember.get(display) || { vert: 0, rouge: 0, violet: 0 },
    })
  );

  // Tri : nombre de sorties décroissant, puis nom alphabétique
  const sorted = entries.sort(
    (a, b) => b.count - a.count || a.display.localeCompare(b.display, "fr")
  );

  return limit === undefined ? sorted : sorted.slice(0, limit);
}

/** Raccourci pratique à partir d'une liste d'objets Participation (sorties passées). */
export function buildAssiduityRankingFromParticipations(
  participations: (Pick<Participation, "participant_name"> &
    Partial<Pick<Participation, "group_level">>)[],
  limit?: number
): AssiduityEntry[] {
  return buildAssiduityRanking(participations, limit);
}
