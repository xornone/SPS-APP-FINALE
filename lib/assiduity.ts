import type { Participation } from "./types";

export interface AssiduityEntry {
  display: string;
  count: number;
}

// Bornes (code points) de la plage Unicode des diacritiques combinants
// (accents, cedilles, etc.) isoles par String.prototype.normalize("NFD") :
// un "e" + COMBINING ACUTE ACCENT devient deux code points distincts pour
// un "é" — retirer ceux compris dans cette plage revient donc a retirer
// les accents tout en gardant la lettre de base.
const COMBINING_DIACRITICS_START = 0x0300;
const COMBINING_DIACRITICS_END = 0x036f;

function stripDiacritics(value: string): string {
  let out = "";
  for (const ch of value.normalize("NFD")) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= COMBINING_DIACRITICS_START && code <= COMBINING_DIACRITICS_END) continue;
    out += ch;
  }
  return out;
}

/**
 * Normalise un nom pour regrouper les variantes d'orthographe d'une meme
 * personne : accents ("Trégaro" / "Tregaro"), casse, espaces en trop, et
 * ordre nom/prenom ("Thomas Tregaro" / "Tregaro Thomas" — les mots sont
 * tries pour que l'ordre n'ait plus d'importance). Volontairement simple
 * et previsible plutot qu'un rapprochement flou (distance de Levenshtein,
 * etc.) qui risquerait de fusionner deux personnes differentes par erreur.
 * Le tri des mots accepte un risque similaire mais rare : deux personnes
 * dont les noms seraient une permutation exacte l'une de l'autre (ex.
 * "Marie Claude" et "Claude Marie") seraient a tort regroupees — juge
 * acceptable pour un club de cette taille.
 */
export function normalizeMemberName(name: string): string {
  const cleaned = stripDiacritics(name.trim().replace(/\s+/g, " ")).toLowerCase();
  return cleaned.split(" ").sort().join(" ");
}

/**
 * Regroupe une liste de noms de participants (un nom par participation,
 * doublons inclus) par personne (voir normalizeMemberName) et retourne le
 * classement par nombre de participations decroissant, limite a `limit`
 * entrees. L'orthographe affichee pour chaque personne est celle qu'elle a
 * utilisee le plus souvent (a egalite, la premiere rencontree) : ainsi le
 * nom affiche reste stable et lisible meme si l'orthographe a varie d'une
 * inscription a l'autre.
 */
export function buildAssiduityRanking(names: string[], limit: number): AssiduityEntry[] {
  const groups = new Map<string, { total: number; variants: Map<string, number> }>();

  for (const raw of names) {
    const display = raw.trim().replace(/\s+/g, " ");
    if (!display) continue;
    const key = normalizeMemberName(display);
    let group = groups.get(key);
    if (!group) {
      group = { total: 0, variants: new Map() };
      groups.set(key, group);
    }
    group.total++;
    group.variants.set(display, (group.variants.get(display) || 0) + 1);
  }

  const entries: AssiduityEntry[] = Array.from(groups.values()).map((group) => {
    let bestVariant = "";
    let bestCount = -1;
    for (const [variant, count] of group.variants) {
      if (count > bestCount) {
        bestVariant = variant;
        bestCount = count;
      }
    }
    return { display: bestVariant, count: group.total };
  });

  return entries.sort((a, b) => b.count - a.count).slice(0, limit);
}

/** Raccourci pratique a partir d'une liste de participations (voir buildAssiduityRanking). */
export function buildAssiduityRankingFromParticipations(
  participations: Pick<Participation, "participant_name">[],
  limit: number
): AssiduityEntry[] {
  return buildAssiduityRanking(
    participations.map((p) => p.participant_name),
    limit
  );
}
