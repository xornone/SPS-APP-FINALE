"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { RideWeather } from "@/lib/weather";
import { computeScrubAtProgress, type ActiveScrub } from "@/lib/scrub";
import { WeatherWidget } from "./WeatherWidget";
import { ElevationChart } from "./ElevationChart";

const RideMap = dynamic(
  () => import("./RideMap").then((mod) => mod.RideMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-black/[0.03] dark:bg-white/[0.03] animate-pulse">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-sps-violet600 border-t-transparent" />
      </div>
    ),
  }
);

export function InteractiveRideTrack({
  points,
  elevations,
  distanceKm = 0,
  weather,
}: {
  points?: [number, number][] | null;
  elevations?: number[] | null;
  distanceKm?: number;
  weather?: RideWeather | null;
}) {
  const [activeScrub, setActiveScrub] = useState<ActiveScrub | null>(null);

  const defaultScrub = useMemo(
    () => computeScrubAtProgress(0, elevations, points, distanceKm || 0, weather),
    [elevations, points, distanceKm, weather]
  );

  const handleScrub = useCallback(
    (progress: number | null) => {
      if (progress === null) {
        setActiveScrub(null);
        return;
      }
      const scrub = computeScrubAtProgress(
        progress,
        elevations,
        points,
        distanceKm || 0,
        weather
      );
      setActiveScrub(scrub);
    },
    [elevations, points, distanceKm, weather]
  );

  return (
    <>
      {/* Widget météo synchronisé avec le survol */}
      <WeatherWidget
        weather={weather || null}
        activeScrub={activeScrub}
        onResetScrub={() => setActiveScrub(null)}
      />

      {/* Carte Leaflet avec curseur animé à la position exacte du D+ */}
      <div className="mx-5 mb-4 h-[220px] overflow-hidden rounded-[22px] border border-neutral-200/90 shadow-xs dark:border-white/10">
        <RideMap
          points={points}
          className="h-full w-full"
          activePoint={activeScrub?.point}
          activeLabel={activeScrub?.mapLabel}
        />
      </div>

      {/* Courbe de D+ interactive (touch / drag mobile & hover desktop) */}
      {elevations && elevations.length > 1 && (
        <div className="px-5 pb-1">
          <ElevationChart
            elevations={elevations}
            distanceKm={distanceKm}
            activeScrub={activeScrub}
            defaultScrub={defaultScrub}
            onScrub={handleScrub}
          />
        </div>
      )}
    </>
  );
}
