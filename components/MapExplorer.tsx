"use client";

import { useState } from "react";
import Link from "next/link";
import { RideMap } from "./RideMap";
import { Icon } from "./Icons";
import { fmtDateLong, fmtKm, fmtM, fmtTime } from "@/lib/format";
import type { Ride } from "@/lib/types";

export function MapExplorer({ rides, gpxUrls }: { rides: Ride[]; gpxUrls: Record<string, string | null> }) {
  const [selectedId, setSelectedId] = useState(rides[0]?.id);
  const ride = rides.find((r) => r.id === selectedId);

  if (!rides.length) {
    return <p className="mx-5 rounded-2xl border border-dashed border-black/10 p-8 text-center text-sm text-black/40 dark:border-white/10 dark:text-white/40">Aucune sortie à venir pour le moment.</p>;
  }

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto px-5 pb-4">
        {rides.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedId(r.id)}
            className={`flex-none rounded-full border px-3.5 py-2 text-[12.5px] font-bold ${
              selectedId === r.id
                ? "border-sps-violet600 bg-sps-violet600 text-white"
                : "border-black/10 bg-white text-black/55 dark:border-white/15 dark:bg-[#1A1422] dark:text-white/55"
            }`}
          >
            {r.title.split("–")[0].trim()}
          </button>
        ))}
      </div>

      {ride && (
        <>
          <div className="px-5 pb-3">
            <h3 className="text-[16px] font-extrabold">{ride.title}</h3>
            <p className="text-xs text-black/45 dark:text-white/45">
              {fmtDateLong(ride.ride_date)} · {fmtTime(ride.ride_time)} · {ride.place}
            </p>
          </div>
          <div className="mx-5 mb-4 h-[220px] overflow-hidden rounded-[22px] border border-black/[0.06] dark:border-white/10">
            <RideMap points={ride.route_points} className="h-full w-full" />
          </div>
          <div className="flex gap-2.5 px-5 pb-4">
            <Stat value={fmtKm(ride.distance_km)} label="Distance" />
            <Stat value={fmtM(ride.elevation_gain_m)} label="D+" />
          </div>
          <div className="flex gap-2.5 px-5 pb-2.5">
            {gpxUrls[ride.id] ? (
              <a
                href={gpxUrls[ride.id]!}
                download
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white py-3 text-[13px] font-bold dark:border-white/15 dark:bg-[#1A1422]"
              >
                <Icon name="download" size={15} /> Télécharger le GPX
              </a>
            ) : (
              <span className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-black/10 py-3 text-[13px] text-black/35 dark:border-white/15 dark:text-white/35">
                Pas de GPX importé
              </span>
            )}
            {ride.strava_url && (
              <a
                href={ride.strava_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white py-3 text-[13px] font-bold dark:border-white/15 dark:bg-[#1A1422]"
              >
                <Icon name="external" size={15} /> Strava
              </a>
            )}
          </div>
          <div className="flex gap-2.5 px-5 pb-6">
            <Link
              href={`/rides/${ride.id}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white py-3 text-[13px] font-bold dark:border-white/15 dark:bg-[#1A1422]"
            >
              <Icon name="route" size={15} /> Ouvrir la sortie
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-black/[0.06] bg-white py-3 text-center dark:border-white/10 dark:bg-[#1A1422]">
      <span className="block font-display text-[21px] leading-none">{value}</span>
      <span className="mt-1 block text-[10px] uppercase tracking-wide text-black/35 dark:text-white/35">{label}</span>
    </div>
  );
}
