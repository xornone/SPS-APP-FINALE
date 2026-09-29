"use client";

import { useMemo, useState } from "react";
import { Icon } from "./Icons";
import { fmtKm, fmtM } from "@/lib/format";

const STEP = 10;
// Demi-largeur de la fenetre de correspondance autour de la distance
// choisie : avec un pas de graduation de 10 km, une tolerance de 5 km de
// chaque cote couvre exactement l'intervalle entre deux graduations sans
// zone morte ni chevauchement.
const TOLERANCE_KM = 5;

// Volontairement une forme allegee (pas le Ride complet) : les sorties
// avec trace GPX portent souvent route_points, un tableau de coordonnees
// potentiellement volumineux (trace GPS parsee, des centaines/milliers de
// points). Ce composant n'en a pas besoin — ne faire traverser la
// frontiere serveur/client qu'avec les quelques champs utiles ici evite de
// gonfler inutilement le payload envoye au navigateur, surtout que cet
// onglet agrege a la fois les sorties a venir et TOUTES les sorties
// passees (contrairement a l'Accueil, qui ne fait traverser cette
// frontiere que pour les sorties a venir).
export interface GpxEntry {
  id: string;
  distanceKm: number;
  elevationGainM: number;
  gpxUrl: string;
}

/**
 * Formulaire "quelle distance veux-tu faire ?" en haut de l'onglet Traces
 * GPX : une barre de niveau graduee tous les 10 km (0 au maximum observe
 * parmi les traces disponibles, arrondi au dizaine superieure, au moins
 * 100 km pour garder une echelle lisible meme avec peu de sorties). Une
 * fois la distance validee, les traces dont la distance est proche (a
 * TOLERANCE_KM pres) s'affichent avec leur distance et leur D+ (pas le nom
 * de la sortie, volontairement omis pour rester une liste de traces).
 * Composant client car la selection est purement interactive ; les
 * donnees (entries) viennent du serveur (voir app/(shell)/gpx/page.tsx).
 */
export function GpxDistanceFilter({ entries }: { entries: GpxEntry[] }) {
  const maxDistance = entries.reduce((max, e) => Math.max(max, e.distanceKm), 0);
  const sliderMax = Math.max(100, Math.ceil(maxDistance / STEP) * STEP);

  const ticks = useMemo(() => {
    const arr: number[] = [];
    for (let t = 0; t <= sliderMax; t += STEP) arr.push(t);
    return arr;
  }, [sliderMax]);

  const [distance, setDistance] = useState(Math.round(sliderMax / 2 / STEP) * STEP);
  const [validated, setValidated] = useState<number | null>(null);

  const matches = useMemo(() => {
    if (validated === null) return [];
    return entries
      .filter((e) => Math.abs(e.distanceKm - validated) <= TOLERANCE_KM)
      .sort((a, b) => Math.abs(a.distanceKm - validated) - Math.abs(b.distanceKm - validated));
  }, [entries, validated]);

  return (
    <div className="mx-5 mb-6 rounded-[20px] border border-black/[0.06] bg-white p-4 shadow-cardSm dark:border-white/10 dark:bg-[#1A1422]">
      <h2 className="text-[13px] font-extrabold">Quelle distance veux-tu faire ?</h2>
      <p className="mt-0.5 text-[12px] text-black/45 dark:text-white/45">
        Choisis une distance, les traces qui correspondent s&apos;affichent en dessous.
      </p>

      <div className="mt-4">
        <div className="mb-2 text-center font-display text-[22px] tracking-wide text-sps-violet600 dark:text-sps-violet400">
          {distance} km
        </div>
        <input
          type="range"
          min={0}
          max={sliderMax}
          step={1}
          value={distance}
          onChange={(e) => setDistance(Number(e.target.value))}
          className="w-full accent-sps-violet600"
          aria-label="Distance souhaitee (km)"
        />
        <div className="mt-1 flex justify-between text-[10px] font-semibold text-black/35 dark:text-white/35">
          {ticks.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setValidated(distance)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-sps-violet600 py-2.5 text-[13px] font-extrabold text-white"
      >
        <Icon name="check" size={15} />
        Valider
      </button>

      {validated !== null && (
        <div className="mt-4 flex flex-col gap-2 border-t border-black/[0.06] pt-4 dark:border-white/10">
          {matches.length === 0 ? (
            <p className="px-2 text-center text-[12.5px] text-black/40 dark:text-white/40">
              Aucune trace ne correspond a {validated} km pour le moment. Essaie une autre distance.
            </p>
          ) : (
            matches.map(({ id, distanceKm, elevationGainM, gpxUrl }) => (
              <div
                key={id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-black/[0.06] px-3.5 py-3 dark:border-white/10"
              >
                <p className="text-[14px] font-extrabold">
                  {fmtKm(distanceKm)} <span className="font-semibold text-black/40 dark:text-white/40">·</span>{" "}
                  {fmtM(elevationGainM)} D+
                </p>
                <a
                  href={gpxUrl}
                  download
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-black/[0.08] dark:border-white/10"
                  aria-label="Telecharger cette trace GPX"
                >
                  <Icon name="download" size={16} />
                </a>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
