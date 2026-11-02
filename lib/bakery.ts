export const BAKERIES_STORAGE_KEY = "sps_saved_bakeries";

/**
 * Extrait le nom de la boulangerie de la description d'une sortie si présente.
 * Prend en charge les formats avec ou sans guillemets.
 * Exemple : "🥐 Arrêt ravito : Boulangerie des Matelles" -> "Boulangerie des Matelles"
 */
export function extractBakeryFromDescription(desc: string): string | null {
  if (!desc) return null;
  const match = desc.match(/🥐\s*Arrêt ravito\s*:\s*([^\r\n]+)/i);
  if (!match) return null;
  const cleaned = match[1].trim().replace(/^["'«»]+|["'«»]+$/g, "").trim();
  return cleaned || null;
}

/**
 * Met à jour, insère ou supprime la ligne "🥐 Arrêt ravito : <nom>" dans la description
 * sans altérer le reste du contenu saisi par l'utilisateur.
 */
export function updateBakeryInDescription(desc: string, newBakery: string): string {
  const bakeryPattern = /(?:\r?\n)*[^\S\r\n]*🥐\s*Arrêt ravito\s*:[^\r\n]*/i;
  const cleanBakery = (newBakery || "").trim();

  if (!cleanBakery) {
    return desc.replace(bakeryPattern, "").replace(/\n{3,}/g, "\n\n").trim();
  }

  const newLine = `🥐 Arrêt ravito : ${cleanBakery}`;

  if (bakeryPattern.test(desc)) {
    return desc.replace(bakeryPattern, `\n\n${newLine}`).replace(/\n{3,}/g, "\n\n").trim();
  }

  const trimmed = desc.trim();
  return trimmed ? `${trimmed}\n\n${newLine}` : newLine;
}
