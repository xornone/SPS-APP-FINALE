import type { Ride } from "./types";

/**
 * Identifie si une sortie correspond au Social Ride de Noël SPS.
 * Détecte l'identifiant spécifique ou la présence de mots-clés de Noël dans le titre.
 */
export function isChristmasRide(ride?: (Pick<Ride, "id" | "title"> & Partial<Ride>) | null): boolean {
  if (!ride) return false;
  if (ride.id === "4eed0c3d-2cef-4a60-bb96-bdd911769b6f") return true;
  const title = (ride.title || "").toLowerCase();
  return (
    title.includes("noël") ||
    title.includes("noel") ||
    title.includes("christmas") ||
    title.includes("🎅") ||
    title.includes("🎄")
  );
}
