"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "./Icons";
import { GroupBadge } from "./GroupBadge";
import { PlaceLink } from "./PlaceLink";
import { fmtDateShort, fmtKm, fmtM, fmtTime } from "@/lib/format";
import type { GroupLevel } from "@/lib/types";

const STEP = 10;

// Volontairement une forme allegee (pas le Ride complet) : les sorties
// avec trace GPX portent souvent route_points, un tableau de coordonnees
// potentiellement volumineux (trace GPS parsee, des centaines/milliers de
// points). Ce composant n'en a pas besoin — ne faire traverser la
// frontiere serveur/client qu'avec les quelques champs utiles ici evite de
// gonfler inutilement le payload envoye au navigateur.
export interface GpxEntry {
  id: string;
  title: string;
  rideDate: string;
  rideTime: string;
  place: string;
  placeUrl: string | null;
  distanceKm: number;
  elevationGainM: number;
  groups: GroupLevel[];
  gpxUrl: string;
}

/**
 * Onglet Traces GPX : une seule liste (plus de distinction a venir /
 * sorties passees), triee de la sortie la plus longue a la plus courte.
 * Un curseur "distance minimum" permet de ne garder que les sorties d'au
 * moins la distance choisie. Composant client car la selection et le tri
 * sont interactifs ; les donnees (entries) viennent du serveur (voir
 * app/(shell)/gpx/page.tsx).
 */
export function GpxList({ entries }: { entries: GpxEntry[] }) {
  const maxDistance = entries.reduce((max, e) => Math.max(max, e.distanceKm), 0);
  const sliderMax = Math.max(100, Math.ceil(maxDistance / STEP) * STEP);

  const ticks = useMemo(() => {
    const arr: number[] = [];
    for (let t = 0; t <= sliderMax; t += STEP) arr.push(t);
    return arr;
  }, [sliderMax]);

  const [distance, setDistance] = useState(Math.round(sliderMax / 2 / STEP) * STEP);
  const [minDistance, setMinDistance] = useState<number | null>(null);

  const sorted = useMemo(() => {
    return [...entries]
      .filter((e) => minDistance === null || e.distanceKm >= minDistance)
      .sort((a, b) => b.distanceKm - a.distanceKm);
  }, [entries, minDistance]);

  return (
    <>
      <div className="mx-5 mb-6 rounded-[20px] border border-black/[0.06] bg-white p-4 shadow-cardSm dark:border-white/10 dark:bg-[#1A1422]">
        <h2 className="text-[13px] font-extrabold">Quelle distance minimum veux-tu faire ?</h2>
        <p className="mt-0.5 text-[12px] text-black/45 dark:text-white/45">
          Choisis une distance, les sorties d&apos;au moins cette distance s&apos;affichent en dessous, triees de la
          plus longue a la plus courte.
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
            aria-label="Distance minimum souhaitee (km)"
          />
          <div className="mt-1 flex justify-between text-[10px] font-semibold text-black/35 dark:text-white/35">
            {ticks.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMinDistance(distance)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sps-violet600 py-2.5 text-[13px] font-extrabold text-white"
          >
            <Icon name="check" size={15} />
            Valider
          </button>
          {minDistance !== null && (
            <button
              type="button"
              onClick={() => setMinDistance(null)}
              className="rounded-xl border border-black/[0.08] px-4 text-[13px] font-extrabold text-black/60 dark:border-white/10 dark:text-white/60"
            >
              Reinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-5">
        {sorted.length === 0 ? (
          <p className="px-2 text-center text-[12.5px] text-black/40 dark:text-white/40">
            Aucune sortie ne fait au moins {minDistance} km pour le moment. Essaie une autre distance.
          </p>
        ) : (
          sorted.map((entry) => <GpxRow key={entry.id} entry={entry} />)
        )}
      </div>
    </>
  );
}

function GpxRow({ entry }: { entry: GpxEntry }) {
  const { id, title, rideDate, rideTime, place, placeUrl, distanceKm, elevationGainM, groups, gpxUrl } = entry;

  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-black/[0.06] bg-white p-4 shadow-cardSm dark:border-white/10 dark:bg-[#1A1422]">
      <div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-sps-violet600/10 text-sps-violet600 dark:text-sps-violet400">
        <Icon name="gpx" size={20} />
      </div>
      <Link href={`/rides/${id}`} className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-extrabold leading-tight">{title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-black/50 dark:text-white/50">
          <span>
            {fmtDateShort(rideDate)} · {fmtTime(rideTime)}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="flag" size={11} /> <PlaceLink place={place} placeUrl={placeUrl} />
          </span>
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-black/45 dark:text-white/45">
          <span>
            <b className="text-black/70 dark:text-white/70">{fmtKm(distanceKm)}</b> ·{" "}
            <b className="text-black/70 dark:text-white/70">{fmtM(elevationGainM)}</b> D+
          </span>
          <span className="flex gap-1">
            {groups.map((g) => (
              <GroupBadge key={g} group={g} withRange={false} />
            ))}
          </span>
        </p>
      </Link>
      {/*
        Pas de onClick ici : un gestionnaire d'evenement sur un element
        natif ne peut pas etre passe depuis un composant serveur (React
        refuse de le serialiser) — c'etait la cause d'un bug precedent sur
        cette page. Il n'est de toute facon pas necessaire : ce lien est un
        frere de <Link>, pas imbrique dedans, un clic dessus ne declenche
        donc jamais la navigation de <Link>.
      */}
      <a
        href={gpxUrl}
        download
        className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-black/[0.08] bg-white dark:border-white/10 dark:bg-[#1A1422]"
        aria-label={`Telecharger le GPX de ${title}`}
      >
        <Icon name="download" size={17} />
      </a>
    </div>
  );
}
