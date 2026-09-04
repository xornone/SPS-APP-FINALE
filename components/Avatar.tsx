import { initials } from "@/lib/format";

const GRADIENTS = [
  ["#7C3AED", "#5B21B6"],
  ["#A78BFA", "#7C3AED"],
  ["#5B21B6", "#33124F"],
];

function seedFromStr(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function Avatar({
  name,
  seed,
  size = "md",
  className = "",
}: {
  name: string;
  /** Chaine utilisee pour choisir une couleur stable — le nom lui-meme convient,
   * ainsi la meme personne garde la meme couleur d'une sortie a l'autre. */
  seed: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [from, to] = GRADIENTS[seedFromStr(seed) % GRADIENTS.length];
  const sizeClass = { sm: "h-6 w-6 text-[10px] rounded-full", md: "h-9 w-9 text-[13px] rounded-xl", lg: "h-16 w-16 text-2xl rounded-2xl" }[size];
  return (
    <span
      className={`flex flex-none items-center justify-center font-extrabold text-white ${sizeClass} ${className}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {initials(name)}
    </span>
  );
}
