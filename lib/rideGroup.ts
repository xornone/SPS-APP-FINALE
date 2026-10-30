import type { GroupLevel, Ride } from "./types";

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
