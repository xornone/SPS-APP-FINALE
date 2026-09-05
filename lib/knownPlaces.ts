/**
 * Lieux de rendez-vous frequents du club : associe un nom (tel que saisi
 * dans "Lieu de depart") a son lien Google Maps, pour pre-remplir
 * automatiquement le lien sans que l'admin ait a le rechercher a chaque
 * fois. La comparaison est insensible a la casse et aux espaces en trop
 * autour du nom, mais le nom lui-meme doit correspondre exactement.
 *
 * Pour ajouter un nouveau lieu : ajouter une ligne ci-dessous avec le nom
 * exact utilise dans le champ "Lieu de depart" et son lien Google Maps
 * (menu "Partager" sur Google Maps -> copier le lien).
 */
export const KNOWN_PLACE_LINKS: Record<string, string> = {
  "marché du lez": "https://maps.app.goo.gl/EJtpGzv1rseboNxy6",
  corum: "https://maps.app.goo.gl/TY124riYiLEsRg1k6",
};

function normalizePlaceName(place: string): string {
  return place.trim().toLowerCase();
}

/** Retourne le lien connu pour ce lieu, ou null si le nom n'est pas reconnu. */
export function lookupPlaceUrl(place: string): string | null {
  return KNOWN_PLACE_LINKS[normalizePlaceName(place)] || null;
}

/** True si ce lien est l'un des liens connus (donc probablement auto-rempli). */
export function isKnownPlaceUrl(url: string): boolean {
  const trimmed = url.trim();
  return Object.values(KNOWN_PLACE_LINKS).includes(trimmed);
}
