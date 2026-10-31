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
  const firstName = name.trim().split(" ")[0];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap ${
        onDark ? "border-white/50 text-white" : STYLES[group]
      }`}
      title={name}
    >
      {firstName}
    </span>
  );
}
