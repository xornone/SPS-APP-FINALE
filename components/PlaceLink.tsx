"use client";

import { Icon } from "./Icons";

/**
 * Affiche le nom du lieu de depart, cliquable vers son lien Google Maps
 * quand un `placeUrl` est renseigne — sur les cartes de sortie (Accueil,
 * onglet Sorties), toute la carte est deja un <Link> Next.js : on ne peut
 * pas y imbriquer un <a> (HTML invalide, casserait le rendu du reste de la
 * carte). On utilise donc un <span> cliquable qui stoppe la propagation du
 * clic avant qu'il n'atteigne le lien englobant, plutot qu'un vrai lien.
 *
 * Sur la page de detail d'une sortie (pas de <Link> englobant), un <a>
 * classique reste utilise directement — voir app/(shell)/rides/[id]/page.tsx.
 */
export function PlaceLink({
  place,
  placeUrl,
  className = "",
}: {
  place: string;
  placeUrl?: string | null;
  className?: string;
}) {
  if (!placeUrl) return <>{place}</>;

  function openMap(e: React.SyntheticEvent) {
    e.preventDefault();
    e.stopPropagation();
    window.open(placeUrl!, "_blank", "noopener,noreferrer");
  }

  return (
    <span
      role="link"
      tabIndex={0}
      onClick={openMap}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") openMap(e);
      }}
      className={`inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 ${className}`}
    >
      {place}
      <Icon name="external" size={11} />
    </span>
  );
}
