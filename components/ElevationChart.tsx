"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
  const [isInteractive, setIsInteractive] = useState(false);

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

  const w = 300;
  const h = 70;

  const { line, area, min, max, span, rawMin } = useMemo(() => {
    if (!elevations || elevations.length < 2) {
      return { line: "", area: "", min: 0, max: 0, span: 1, rawMin: 0 };
    }
    let minVal = elevations[0];
    let maxVal = elevations[0];
    for (let i = 1; i < elevations.length; i++) {
      if (elevations[i] < minVal) minVal = elevations[i];
      if (elevations[i] > maxVal) maxVal = elevations[i];
    }
    const s = maxVal - minVal || 1;
    const pts = elevations.map((v, i) => {
      const x = (i / (elevations.length - 1)) * w;
      const y = h - 4 - ((v - minVal) / s) * (h - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const l = "M " + pts.join(" L ");
    const a = `${l} L ${w},${h} L 0,${h} Z`;
    return {
      line: l,
      area: a,
      min: Math.round(minVal),
      max: Math.round(maxVal),
      span: s,
      rawMin: minVal,
    };
  }, [elevations]);

  // Le survol actif est prioritaire ; sinon defaultScrub ou repli km 0
  const currentScrub = useMemo(() => {
    if (activeScrub) return activeScrub;
    if (defaultScrub) return defaultScrub;
    return {
      progress: 0,
      index: 0,
      distanceKm: 0,
      elevationM: min,
      slopePercent: 0,
      point: null,
      mapLabel: "",
      weather: null,
    };
  }, [activeScrub, defaultScrub, min]);

  // Position du curseur actif
  let cursorX: number | null = null;
  let cursorY: number | null = null;
  if (activeScrub && activeScrub.progress !== undefined) {
    cursorX = activeScrub.progress * w;
    const ele = activeScrub.elevationM;
    cursorY = h - 4 - ((ele - rawMin) / span) * (h - 8);
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Sur touch mobile / tablette : on n'intercepte pas si le mode interactif n'est pas actif
    if (e.pointerType !== "mouse" && !isInteractive) {
      return;
    }
    isPointerDownRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    handlePointer(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Sur desktop souris : survol direct sans bloquer le scroll
    // Sur mobile / tactile : actif uniquement si isInteractive et appui en cours
    if (e.pointerType === "mouse") {
      handlePointer(e.clientX);
    } else if (isInteractive && isPointerDownRef.current) {
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
  };

  const onMouseLeave = () => {
    // Si la souris quitte sans mode interactif verrouillé, on réinitialise
    if (!isInteractive && onScrub) {
      onScrub(null);
    }
  };

  const handleToggleInteractive = () => {
    if (isInteractive) {
      setIsInteractive(false);
      if (onScrub) onScrub(null);
    } else {
      setIsInteractive(true);
      if (!activeScrub && onScrub) {
        onScrub(0);
      }
    }
  };

  if (!elevations || elevations.length < 2) return null;

  const scrubWeather = currentScrub?.weather;
  const sky = scrubWeather ? weatherCodeInfo(scrubWeather.weatherCode) : null;
  const isExploring = isInteractive || (activeScrub !== null && activeScrub !== undefined);

  return (
    <div className="flex flex-col gap-1.5">
      {/* Barre d'informations interactive (HUD) */}
      <div className="flex items-center justify-between min-h-[26px] px-1 text-[11px]">
        {isExploring && currentScrub ? (
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

              {/* Météo au point de passage si disponible */}
              {scrubWeather && sky && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-black/70 dark:text-white/80">
                  <span className="text-black/30 dark:text-white/30">·</span>
                  <span className="font-bold text-sps-violet600 dark:text-sps-violet400">
                    ~{scrubWeather.time}
                  </span>
                  <Icon name={sky.icon} size={13} className="text-sps-violet600 dark:text-sps-violet400" />
                  <span className="font-black">{scrubWeather.temperatureC}°</span>
                  <span className="hidden sm:inline text-[10px] text-black/45 dark:text-white/45">
                    {scrubWeather.precipitationProbability}% 🌧️ · {scrubWeather.windSpeedKmh} km/h 💨
                  </span>
                </div>
              )}
            </div>

            {/* Bouton de contrôle en mode actif */}
            <button
              type="button"
              onClick={handleToggleInteractive}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition active:scale-95 ${
                isInteractive
                  ? "bg-sps-violet600 text-white shadow-xs hover:bg-sps-violet700"
                  : "bg-sps-violet500/10 text-sps-violet600 dark:bg-sps-violet400/15 dark:text-sps-violet300 hover:bg-sps-violet500/20"
              }`}
            >
              <Icon name={isInteractive ? "check" : "route"} size={12} />
              <span>{isInteractive ? "Terminer" : "Explorer"}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full text-black/60 dark:text-white/60">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold">
              <Icon name="mountain" size={13} className="text-sps-violet600 dark:text-sps-violet400" />
              <span>
                Min {min} m · Max {max} m
              </span>
            </div>

            <button
              type="button"
              onClick={handleToggleInteractive}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sps-violet500/10 text-sps-violet600 dark:bg-sps-violet400/15 dark:text-sps-violet300 hover:bg-sps-violet500/20 active:scale-95 transition"
            >
              <Icon name="route" size={12} />
              <span>Explorer le profil</span>
            </button>
          </div>
        )}
      </div>

      {/* Surface SVG : défilement vertical libre par défaut (pan-y), exploration sur activation */}
      <div
        ref={containerRef}
        data-testid="elevation-chart-container"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onMouseLeave={onMouseLeave}
        className={`relative select-none rounded-xl p-1 transition ${
          isInteractive
            ? "touch-none cursor-ew-resize ring-2 ring-sps-violet500/50 bg-sps-violet500/[0.04] dark:bg-sps-violet500/[0.08]"
            : "touch-pan-y cursor-default bg-black/[0.02] dark:bg-white/[0.02]"
        }`}
        style={{ touchAction: isInteractive ? "none" : "pan-y" }}
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

      {/* Indication discrète lorsque l'exploration tactile est active */}
      {isInteractive && (
        <div className="flex items-center justify-center gap-1.5 pt-0.5 text-[10.5px] text-sps-violet600 dark:text-sps-violet400 font-medium animate-fadeIn">
          <span>👆 Glissez horizontalement pour naviguer sur le parcours</span>
        </div>
      )}
    </div>
  );
}
