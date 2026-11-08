/**
 * Gestion du Capitaine de route pour les sorties SPS.
 *
 * Le capitaine peut être stocké directement dans la colonne `captain_name` de la table `rides`,
 * extrait/inséré sous forme de balise masquée <!-- captain: <nom> --> (pour ne pas polluer
 * la description visible de la sortie), ou déduit automatiquement des administrateurs
 * inscrits dans les groupes.
 */

const CAPTAIN_COMMENT_REGEX = /<!--\s*captain\s*:\s*([^>]+?)\s*-->/iu;
const CAPTAIN_COMMENT_LINE_REGEX = /(?:\r?\n)*<!--\s*captain\s*:\s*[^>]*?-->/giu;

const CAPTAIN_REGEX = /(?:(?:🧭|👑|⭐)\s*)?(?:Capitaine(?:\s+de\s+(?:route|sortie))?|Groupe?\s+Leader|Leader(?:\s+de\s+(?:groupe|route|sortie))?)\s*:\s*([^\r\n]+)/iu;
const CAPTAIN_LINE_REGEX = /(?:\r?\n)*[^\S\r\n]*(?:(?:🧭|👑|⭐)\s*)?(?:Capitaine(?:\s+de\s+(?:route|sortie))?|Groupe?\s+Leader|Leader(?:\s+de\s+(?:groupe|route|sortie))?)\s*:[^\r\n]*/giu;

/**
 * Nettoie la description pour l'affichage visible aux membres (fiche et partage WhatsApp) :
 * retire toute mention textuelle ou balise de capitaine afin que la description
 * reste 100% propre et fidèle au texte rédigé par l'organisateur.
 */
export function cleanVisibleDescription(desc?: string | null): string {
  if (!desc) return "";
  return desc
    .replace(CAPTAIN_LINE_REGEX, "")
    .replace(CAPTAIN_COMMENT_LINE_REGEX, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extrait le nom du capitaine de route depuis la description d'une sortie.
 */
export function extractCaptainFromDescription(desc: string): string | null {
  if (!desc) return null;
  const commentMatch = desc.match(CAPTAIN_COMMENT_REGEX);
  if (commentMatch) {
    const cleaned = commentMatch[1].trim();
    if (cleaned) return cleaned;
  }
  const match = desc.match(CAPTAIN_REGEX);
  if (!match) return null;
  const cleaned = match[1].trim().replace(/^["'«»]+|["'«»]+$/g, "").trim();
  return cleaned || null;
}

/**
 * Met à jour ou supprime la balise de capitaine dans la description,
 * stockée sous forme de commentaire masqué <!-- captain: ... -->
 * pour ne jamais encombrer la description visible de la sortie.
 */
export function updateCaptainInDescription(desc: string, newCaptain: string): string {
  const cleanCaptain = (newCaptain || "").trim();

  let cleaned = (desc || "")
    .replace(CAPTAIN_LINE_REGEX, "")
    .replace(CAPTAIN_COMMENT_LINE_REGEX, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!cleanCaptain) {
    return cleaned;
  }

  const commentTag = `<!-- captain: ${cleanCaptain} -->`;
  return cleaned ? `${cleaned}\n\n${commentTag}` : commentTag;
}

/**
 * Récupère le nom du capitaine d'une sortie.
 * Priorité :
 * 1. Champ explicite captain_name
 * 2. Balise dans la description
 * 3. Administrateur(s) inscrit(s) dans un groupe (deviennent automatiquement capitaines de route)
 */
export function getRideCaptain(
  ride?: {
    description?: string | null;
    captain_name?: string | null;
  } | null,
  registeredAdmins?: Array<{ name: string; group?: string }> | null
): string | null {
  if (!ride) return null;
  if (ride.captain_name && ride.captain_name.trim()) {
    return ride.captain_name.trim();
  }
  const fromDesc = extractCaptainFromDescription(ride.description || "");
  if (fromDesc) return fromDesc;

  if (registeredAdmins && registeredAdmins.length > 0) {
    return registeredAdmins.map((a) => a.name).join(", ");
  }

  return null;
}
