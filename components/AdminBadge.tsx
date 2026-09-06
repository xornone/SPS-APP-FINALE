import type { GroupLevel } from "@/lib/types";

// Meme forme que GroupBadge (pilule arrondie) mais sans fond rempli : juste
// le contour, colore selon le groupe de l'admin inscrit, pour reperer d'un
// coup d'oeil dans quel groupe roule chaque admin sans surcharger le texte.
const STYLES: Record<GroupLevel, string> = {
  vert: "border-emerald-500 text-emerald-600 dark:text-emerald-400",
  rouge: "border-red-500 text-red-600 dark:text-red-400",
  violet: "border-violet-500 text-violet-600 dark:text-violet-400",
};

export function AdminBadge({
  name,
  group,
  onDark = false,
}: {
  name: string;
  group: GroupLevel;
  /** Sur fond violet fonce (carte "Prochaine sortie") : contour clair
   * uniforme plutot que la couleur du groupe, illisible sur ce fond. */
  onDark?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border-2 px-2.5 py-0.5 text-[11px] font-bold ${
        onDark ? "border-white/60 text-white" : STYLES[group]
      }`}
    >
      {name}
    </span>
  );
}
