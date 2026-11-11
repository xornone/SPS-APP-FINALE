import {
  findOfficialMember,
  stripEmojiAndDiacritics,
  tokenizeName,
} from "./members";

/**
 * Calcule une clé canonique d'identification pour un votant, en ignorant :
 * - Les accents et diacritiques (ex: Trégaro -> tregaro)
 * - La casse (majuscules/minuscules)
 * - L'inversion prénom / nom (ex: "Thomas Trégaro" === "Trégaro Thomas")
 * - Les espaces multiples, tirets et caractères spéciaux
 * - Les alias et pseudonymes connus (ex: "Charly" -> "Charly Jegat", "JB Lafon" -> "Jean-Baptiste Lafon")
 * - Les correspondances avec les membres officiels SPS
 */
export function getCanonicalVoterKey(rawName: string): string {
  if (!rawName) return "";
  const cleaned = rawName.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";

  // 1. Tenter la réconciliation avec un membre officiel SPS ou alias connu
  const official = findOfficialMember(cleaned);
  if (official) {
    const tokens = tokenizeName(official);
    return [...tokens].sort().join(" ");
  }

  // 2. Si non reconnu dans la liste officielle, normalisation robuste :
  // Suppression diacritiques + emojis, découpage en tokens, tri alphabétique
  const tokens = tokenizeName(cleaned);
  if (tokens.length === 0) {
    return stripEmojiAndDiacritics(cleaned).toLowerCase().trim();
  }
  return [...tokens].sort().join(" ");
}

/**
 * Renvoie un nom d'affichage propre pour le votant.
 * Si le nom correspond à un membre officiel SPS ou à un alias, renvoie le nom officiel formaté.
 * Sinon, renvoie le nom nettoyé.
 */
export function getCanonicalDisplayName(rawName: string): string {
  if (!rawName) return "";
  const cleaned = rawName.trim().replace(/\s+/g, " ");
  const official = findOfficialMember(cleaned);
  if (official) return official;
  return cleaned;
}

/**
 * Détermine si deux saisies de nom correspondent à la même personne.
 */
export function isSameVoter(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  const keyA = getCanonicalVoterKey(nameA);
  const keyB = getCanonicalVoterKey(nameB);
  return Boolean(keyA && keyB && keyA === keyB);
}
