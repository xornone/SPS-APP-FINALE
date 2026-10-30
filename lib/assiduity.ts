import type { Participation } from "./types";
import {
  SPS_ACTIVE_MEMBERS,
  findOfficialMember,
  stripEmojiAndDiacritics,
} from "./members";

export interface AssiduityEntry {
  display: string;
  count: number;
}

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
 *   avec les noms officiels des membres abonnés (ex: "Ben Horny" -> Ben Horny : 9 sorties,
 *   "Duc Nguyen" -> Huu Duc Nguyen, "MIMOUNI redouane ✌" -> Redouane Mimouni, etc.).
 * - Attribue 0 sortie aux membres qui ne sont jamais encore venus.
 * - Trie par nombre de sorties décroissant, puis par ordre alphabétique.
 */
export function buildAssiduityRanking(names: string[], limit?: number): AssiduityEntry[] {
  // Initialisation de tous les membres officiels avec 0 sortie
  const countsByMember = new Map<string, number>();
  for (const member of SPS_ACTIVE_MEMBERS) {
    countsByMember.set(member, 0);
  }

  // Incrément des sorties pour chaque participation réconciliée
  for (const raw of names) {
    if (!raw) continue;
    const official = findOfficialMember(raw);
    if (official) {
      countsByMember.set(official, (countsByMember.get(official) || 0) + 1);
    }
  }

  const entries: AssiduityEntry[] = Array.from(countsByMember.entries()).map(
    ([display, count]) => ({ display, count })
  );

  // Tri : nombre de sorties décroissant, puis nom alphabétique
  const sorted = entries.sort(
    (a, b) => b.count - a.count || a.display.localeCompare(b.display, "fr")
  );

  return limit === undefined ? sorted : sorted.slice(0, limit);
}

/** Raccourci pratique à partir d'une liste d'objets Participation (sorties passées). */
export function buildAssiduityRankingFromParticipations(
  participations: Pick<Participation, "participant_name">[],
  limit?: number
): AssiduityEntry[] {
  return buildAssiduityRanking(
    participations.map((p) => p.participant_name),
    limit
  );
}
