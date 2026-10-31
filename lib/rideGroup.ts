import { type GroupLevel, type Ride } from "./types";

const GROUP_PREFIX: Record<GroupLevel, string> = {
  rouge: "🔴 Rouge -",
  vert: "🟢 Vert -",
  violet: "🟣 Violet -",
};

/**
 * Détecte si une sortie est explicitement identifiée à un groupe d'après son titre.
 * Règle : le texte du titre prévaut strictement sur toute autre information ou émoji.
 * Si le texte ne mentionne aucun groupe, aucune teinte n'est appliquée.
 */
export function detectRideGroup(
  ride: Pick<Ride, "title"> & { ride_groups?: { group_level: GroupLevel }[] }
): GroupLevel | null {
  const title = (ride.title || "").toLowerCase();

  // 1. Priorité absolue : le texte écrit dans le titre
  const textRouge = /\b(groupe\s+)?rouge(?:s)?\b/i.test(title);
  const textVert = /\b(groupe\s+)?vert(?:e)?s?\b/i.test(title);
  const textViolet = /\b(groupe\s+)?violet(?:te)?s?\b/i.test(title);

  const textMatches = (textRouge ? 1 : 0) + (textVert ? 1 : 0) + (textViolet ? 1 : 0);
  if (textMatches === 1) {
    if (textRouge) return "rouge";
    if (textVert) return "vert";
    if (textViolet) return "violet";
  }

  // Si plusieurs groupes sont mentionnés dans le texte, ambiguïté -> pas de teinte
  if (textMatches > 1) {
    return null;
  }

  // 2. Secondaire : émoji dans le titre uniquement si aucun texte contradictoire
  const emojiRouge = ride.title.includes("🔴");
  const emojiVert = ride.title.includes("🟢");
  const emojiViolet = ride.title.includes("🟣");

  const emojiMatches = (emojiRouge ? 1 : 0) + (emojiVert ? 1 : 0) + (emojiViolet ? 1 : 0);
  if (emojiMatches === 1) {
    if (emojiRouge) return "rouge";
    if (emojiVert) return "vert";
    if (emojiViolet) return "violet";
  }

  // Le texte n'identifie aucun groupe -> pas de teinte
  return null;
}

/**
 * Nettoie le titre d'une sortie en retirant les préfixes de groupe (émoji, couleur, "groupe...")
 * Ex: "🔴 GROUPE ROUGE - SAINT MARTIN DE LONDRES" -> "SAINT MARTIN DE LONDRES",
 * "Groupe Violet - Causse de la Selle" -> "Causse de la Selle",
 * "Saint Martin de Londres" -> "Saint Martin de Londres".
 */
export function cleanRideTitle(title: string): string {
  if (!title) return "";
  let cleaned = title.trim();

  // 1. Préfixe avec émoji optionnel + "groupe" optionnel + couleur + séparateur (-, :, –, —, |, /, ·)
  cleaned = cleaned.replace(
    /^(?:(?:\u{1F534}|\u{1F7E2}|\u{1F7E3}|🔴|🟢|🟣)\s*)?(?:groupe\s+)?(?:rouge|vert|violet)s?\s*[-:–—|/·]\s*/iu,
    ""
  );

  // 2. Préfixe "GROUPE ROUGE " ou "GROUPE VIOLET " sans tiret
  cleaned = cleaned.replace(
    /^(?:(?:\u{1F534}|\u{1F7E2}|\u{1F7E3}|🔴|🟢|🟣)\s*)?groupe\s+(?:rouge|vert|violet)s?\s+/iu,
    ""
  );

  // 3. Émoji de groupe isolé au tout début
  cleaned = cleaned.replace(/^(?:\u{1F534}|\u{1F7E2}|\u{1F7E3}|🔴|🟢|🟣)\s*/u, "");

  // 4. Séparateur résiduel au début
  cleaned = cleaned.replace(/^[-:–—|/·]\s*/, "");

  cleaned = cleaned.trim();
  return cleaned || title.trim();
}

/**
 * Formate le titre d'une sortie sous la forme standardisée :
 * "🔴 Rouge - [Nom de la sortie]"
 * "🟣 Violet - [Nom de la sortie]"
 * "🟢 Vert - [Nom de la sortie]"
 * Si l'admin a tapé "🔴 GROUPE ROUGE - SAINT MARTIN DE LONDRES", le préfixe est nettoyé et standardisé.
 * Si l'admin a oublié le préfixe et tapé juste "Saint Martin de Londres", le préfixe est automatiquement ajouté
 * d'après le groupe de la sortie.
 */
export function formatRideDisplayTitle(
  ride: Pick<Ride, "title"> & { ride_groups?: { group_level: GroupLevel }[] }
): string {
  const baseTitle = cleanRideTitle(ride.title);
  const detected = detectRideGroup(ride);
  const dbGroup =
    ride.ride_groups && ride.ride_groups.length === 1 ? ride.ride_groups[0].group_level : null;
  const singleGroup = detected || dbGroup;

  if (singleGroup && GROUP_PREFIX[singleGroup]) {
    return `${GROUP_PREFIX[singleGroup]} ${baseTitle}`;
  }

  return baseTitle || ride.title;
}

/**
 * Récupère les groupes effectifs d'une sortie :
 * Priorité aux groupes saisis dans ride_groups, complétés par le groupe détecté dans le titre si manquant.
 */
export function getRideEffectiveGroups(
  ride: Pick<Ride, "title"> & { ride_groups?: { group_level: GroupLevel }[] }
): GroupLevel[] {
  const groupsFromDb = (ride.ride_groups || []).map((g) => g.group_level);
  const detected = detectRideGroup(ride);

  if (groupsFromDb.length > 0) {
    if (detected && !groupsFromDb.includes(detected)) {
      return [...groupsFromDb, detected];
    }
    return groupsFromDb;
  }

  return detected ? [detected] : [];
}
