"use client";

import { useEffect, useRef, useState } from "react";
import { RIDE_SAFETY_NOTICE } from "@/lib/rideSafetyNotice";

// Description ecrite par l'admin + consignes fixes (lib/rideSafetyNotice.ts)
// fusionnees en un seul bloc de texte, dans un unique <p> : necessaire pour
// que line-clamp compte les lignes de facon fiable (compter sur deux <p>
// separes ne marche pas de maniere consistante, notamment sur Safari/iOS,
// tres present chez les membres du club). Cela ne change rien au partage
// WhatsApp : lib/shareMessage.ts continue a ne lire que ride.description et
// n'importe jamais ce composant.
export function RideDescription({ description }: { description: string }) {
  const text = description
    ? `${description}\n\n${RIDE_SAFETY_NOTICE}`
    : `Pas de description pour cette sortie.\n\n${RIDE_SAFETY_NOTICE}`;

  const [expanded, setExpanded] = useState(false);
  // Le bouton "Afficher plus" ne doit apparaitre que si le texte depasse
  // reellement 10 lignes une fois rendu (ca depend de la largeur d'ecran et
  // de la taille de police, donc impossible a savoir cote serveur) : on
  // mesure le debordement du <p> replie au premier rendu cote client.
  const [overflows, setOverflows] = useState(false);
  const paragraphRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = paragraphRef.current;
    if (el) setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  return (
    <div className="px-5 py-4 text-[13.5px] leading-relaxed text-black/60 dark:text-white/60">
      <h4 className="mb-2 font-display text-sm tracking-wide text-black dark:text-white">Description</h4>
      <p
        ref={paragraphRef}
        className={`whitespace-pre-wrap break-words ${expanded ? "" : "line-clamp-[10]"}`}
      >
        {text}
      </p>
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-[12.5px] font-semibold text-sps-violet600 dark:text-sps-violet400"
        >
          {expanded ? "Afficher moins" : "Afficher plus"}
        </button>
      )}
    </div>
  );
}
