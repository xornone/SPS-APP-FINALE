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

// Plages (code points) couvrant les emoji et symboles que des membres
// ajoutent parfois a leur nom (ex. "Florian Maillou 🚀", "Théo DOUSSOT 🚴🏼",
// "MIMOUNI redouane ✌") : pictogrammes, emoticones, transport, dingbats,
// symboles divers, indicateurs regionaux (drapeaux), modificateurs de
// carnation et le joiner invisible (ZWJ) qui chaine les emoji composes.
// Volontairement large plutot qu'une liste blanche : le but est de ne
// jamais laisser un emoji faire compter deux fois la meme personne, ni
// polluer le nom affiche.
const EMOJI_RANGES: Array<[number, number]> = [
  [0x2300, 0x23ff], // symboles divers techniques (⌚ etc.)
  [0x2600, 0x27bf], // symboles divers + dingbats (✌ ☀ ✔ etc.)
  [0x2b00, 0x2bff], // fleches/etoiles supplementaires
  [0x1f1e6, 0x1f1ff], // indicateurs regionaux (drapeaux)
  [0x1f300, 0x1faff], // emoji/pictogrammes principaux (🚀 🚴 etc.)
  [0xfe0e, 0xfe0f], // selecteurs de variation (texte/emoji)
];

function isEmojiCodePoint(code: number): boolean {
  if (code === 0x200d) return true; // zero-width joiner (emoji composes)
  return EMOJI_RANGES.some(([start, end]) => code >= start && code <= end);
}

function stripEmoji(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (isEmojiCodePoint(code)) continue;
    out += ch;
  }
  return out.replace(/\s+/g, " ").trim();
}

/**
 * Normalise un nom pour regrouper les variantes d'orthographe d'une meme
 * personne : emoji ("Florian Maillou 🚀" / "Florian Maillou"), accents
 * ("Trégaro" / "Tregaro"), casse, espaces en trop, et ordre nom/prenom
 * ("Thomas Tregaro" / "Tregaro Thomas" — les mots sont tries pour que
 * l'ordre n'ait plus d'importance). Volontairement simple et previsible
 * plutot qu'un rapprochement flou (distance de Levenshtein, etc.) qui
 * risquerait de fusionner deux personnes differentes par erreur. Le tri
 * des mots accepte un risque similaire mais rare : deux personnes dont
 * les noms seraient une permutation exacte l'une de l'autre (ex. "Marie
 * Claude" et "Claude Marie") seraient a tort regroupees — juge acceptable
 * pour un club de cette taille.
 */
export function normalizeMemberName(name: string): string {
  const cleaned = stripDiacritics(stripEmoji(name.trim().replace(/\s+/g, " "))).toLowerCase();
  return cleaned.split(" ").sort().join(" ");
}

/**
 * Regroupe une liste de noms de participants (un nom par participation,
 * doublons inclus) par personne (voir normalizeMemberName) et retourne le
 * classement complet par nombre de participations decroissant (tous les
 * membres — c'est a l'affichage, voir MemberAssiduityRanking, de ne
 * montrer que les premiers avec un bouton "Afficher plus"). Passer `limit`
 * pour tronquer directement la liste si besoin. L'orthographe affichee
 * pour chaque personne est celle qu'elle a utilisee le plus souvent (a
 * egalite, la premiere rencontree) : ainsi le nom affiche reste stable et
 * lisible meme si l'orthographe a varie d'une inscription a l'autre.
 */
export function buildAssiduityRanking(names: string[], limit?: number): AssiduityEntry[] {
  const groups = new Map<string, { total: number; variants: Map<string, number> }>();

  for (const raw of names) {
    const display = stripEmoji(raw.trim().replace(/\s+/g, " "));
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

  const sorted = entries.sort((a, b) => b.count - a.count);
  return limit === undefined ? sorted : sorted.slice(0, limit);
}

/** Raccourci pratique a partir d'une liste de participations (voir buildAssiduityRanking). */
export function buildAssiduityRankingFromParticipations(
  participations: Pick<Participation, "participant_name">[],
  limit?: number
): AssiduityEntry[] {
  return buildAssiduityRanking(
    participations.map((p) => p.participant_name),
    limit
  );
}
