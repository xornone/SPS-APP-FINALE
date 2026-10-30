"use client";

import { useCallback, useRef } from "react";
import type { ActiveScrub } from "@/lib/scrub";
import { weatherCodeInfo } from "@/lib/weather";
import { Icon } from "./Icons";

export function ElevationChart({
  elevations,
  distanceKm = 0,
  activeScrub,
  defaultScrub,
  onScrub,
}: {
  elevations: number[] | null;
  distanceKm?: number;
  activeScrub?: ActiveScrub | null;
  defaultScrub?: ActiveScrub | null;
  onScrub?: (progress: number | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPointerDownRef = useRef(false);

  const handlePointer = useCallback(
    (clientX: number) => {
      if (!containerRef.current || !onScrub) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relX = clientX - rect.left;
      const progress = Math.max(0, Math.min(1, relX / rect.width));
      onScrub(progress);
    },
    [onScrub]
  );

  if (!elevations || elevations.length < 2) return null;

  const w = 300;
  const h = 70;
  const min = Math.min(...elevations);
  const max = Math.max(...elevations);
  const span = max - min || 1;

  const pts = elevations.map((v, i) => {
    const x = (i / (elevations.length - 1)) * w;
    const y = h - 4 - ((v - min) / span) * (h - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = "M " + pts.join(" L ");
  const area = `${line} L ${w},${h} L 0,${h} Z`;

  // Le survol actif est prioritaire ; sinon repli immédiat sur km 0
  const currentScrub = activeScrub || defaultScrub;

  // Position du curseur actif
  let cursorX: number | null = null;
  let cursorY: number | null = null;
  if (activeScrub && activeScrub.progress !== undefined) {
    cursorX = activeScrub.progress * w;
    const ele = activeScrub.elevationM;
    cursorY = h - 4 - ((ele - min) / span) * (h - 8);
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isPointerDownRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    handlePointer(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Sur desktop, survol direct ; sur mobile / tactile, appui actif
    if (e.pointerType === "mouse" || isPointerDownRef.current) {
      handlePointer(e.clientX);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isPointerDownRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const onPointerCancel = () => {
    isPointerDownRef.current = false;
    if (onScrub) onScrub(null);
  };

  const onMouseLeave = (e: React.MouseEvent) => {
    // Si la souris quitte sans clic maintenu, on réinitialise
    if (!isPointerDownRef.current && onScrub) {
      onScrub(null);
    }
  };

  const scrubWeather = currentScrub?.weather;
  const sky = scrubWeather ? weatherCodeInfo(scrubWeather.weatherCode) : null;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Barre d'informations interactive (HUD) : affiche directement km 0 par défaut */}
      <div className="flex items-center justify-between min-h-[22px] px-1 text-[11px]">
        {currentScrub ? (
          <div className="flex flex-wrap items-center justify-between w-full gap-2 animate-fadeIn">
            {/* Alt & distance & pente */}
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sps-violet600 dark:text-sps-violet400">
                km {currentScrub.distanceKm}
              </span>
              <span className="font-display font-black text-black dark:text-white">
                {currentScrub.elevationM} m
              </span>
              <span
                className={`text-[10px] font-bold rounded px-1.5 py-0.2 ${
                  currentScrub.slopePercent > 3
                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    : currentScrub.slopePercent < -1
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-black/[0.05] text-black/60 dark:bg-white/10 dark:text-white/60"
                }`}
              >
                {currentScrub.slopePercent >= 0 ? `+${currentScrub.slopePercent}%` : `${currentScrub.slopePercent}%`}
              </span>
            </div>

            {/* Météo au point de passage */}
            {scrubWeather && sky ? (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-black/70 dark:text-white/80">
                <span className="text-black/40 dark:text-white/40">·</span>
                <span className="font-bold text-sps-violet600 dark:text-sps-violet400">
                  ~{scrubWeather.time}
                </span>
                <Icon name={sky.icon} size={13} className="text-sps-violet600 dark:text-sps-violet400" />
                <span className="font-black">{scrubWeather.temperatureC}°</span>
                <span className="text-[10px] text-black/45 dark:text-white/45">
                  {scrubWeather.precipitationProbability}% 🌧️ · {scrubWeather.windSpeedKmh} km/h 💨
                </span>
              </div>
            ) : (
              <span className="text-[10px] font-semibold text-black/40 dark:text-white/40">
                Min {min} m · Max {max} m
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between w-full text-black/40 dark:text-white/40">
            <span className="text-[10px] font-semibold">
              Min {min} m · Max {max} m
            </span>
          </div>
        )}
      </div>

      {/* Surface SVG interactive */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onMouseLeave={onMouseLeave}
        className="relative touch-none select-none cursor-ew-resize rounded-xl bg-black/[0.02] p-1 transition dark:bg-white/[0.02]"
        style={{ touchAction: "none" }}
      >
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-[74px] w-full overflow-visible">
          <defs>
            <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#elevGrad)" />
          <path d={line} fill="none" stroke="#7C3AED" strokeWidth={2} />

          {/* Ligne verticale de repère */}
          {cursorX !== null && (
            <line
              x1={cursorX}
              y1={0}
              x2={cursorX}
              y2={h}
              stroke="#7C3AED"
              strokeWidth={1.5}
              strokeDasharray="2,2"
              className="opacity-80"
            />
          )}

          {/* Curseur point sur la courbe */}
          {cursorX !== null && cursorY !== null && (
            <g transform={`translate(${cursorX}, ${cursorY})`}>
              <circle r={7} fill="#7C3AED" fillOpacity={0.25} />
              <circle r={4.5} fill="#7C3AED" stroke="#FFFFFF" strokeWidth={2} />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
