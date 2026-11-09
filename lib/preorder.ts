/**
 * Date d'ouverture publique officielle de la collection et des précommandes SPS 2027.
 * Mardi 10 novembre 2026 à 21h00 (Heure de Paris / Europe/Paris).
 *
 * Avant cette date :
 * - Accessible uniquement par les administrateurs connectés (pour vérification interne).
 *
 * À partir de cette date :
 * - Accessible publiquement à tous les membres et visiteurs sans connexion requise.
 * - Visible sur la page d'accueil (bannière maillot).
 * - Visible dans la barre de navigation inférieure (onglet Pré-commandes).
 */
export const PREORDER_OPEN_DATE = new Date("2026-11-10T21:00:00+01:00");

export function isPreorderOpenToPublic(now: number = Date.now()): boolean {
  return now >= PREORDER_OPEN_DATE.getTime();
}
