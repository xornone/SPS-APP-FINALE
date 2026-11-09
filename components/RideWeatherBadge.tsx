"use client";

import React, { useState } from "react";
import {
  addMinutesToTimeString,
  fmtWeatherTempRange,
  formatDuration,
  getWeatherEmoji,
  weatherCodeInfo,
  type RideWeather,
} from "@/lib/weather";
import { TemperatureGauge } from "./TemperatureGauge";
import { Icon } from "./Icons";

const SCORE_COLORS: Record<NonNullable<RideWeather["suitabilityBadgeColor"]>, string> = {
  emerald: "text-emerald-600 dark:text-emerald-400",
  green: "text-green-600 dark:text-green-400",
  blue: "text-sky-600 dark:text-sky-400",
  amber: "text-amber-600 dark:text-amber-400",
  orange: "text-orange-600 dark:text-orange-400",
  rose: "text-rose-600 dark:text-rose-400",
};

export function RideWeatherBadge({
  weather,
  variant = "default",
  className = "",
}: {
  weather: RideWeather | null | undefined;
  variant?: "default" | "featured";
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!weather || weather.suitabilityScore === undefined) return null;

  const emoji = getWeatherEmoji(weather);
  const color = weather.suitabilityBadgeColor || "green";
  const scoreColor = SCORE_COLORS[color];
  const tempRange = fmtWeatherTempRange(weather);

  const hourlySlots = weather.hourlySlots || [];
  const canExpand = hourlySlots.length > 0;

  const departureTime = weather.departureTime || hourlySlots[0]?.time || "09:00";
  const durationFormatted =
    weather.durationFormatted ||
    (weather.durationMinutes ? formatDuration(weather.durationMinutes) : "2h00");
  const estimatedArrivalTime =
    weather.estimatedArrivalTime ||
    addMinutesToTimeString(departureTime, weather.durationMinutes || 120);

  function handleToggle(e: React.MouseEvent) {
    if (!canExpand) return;
    e.preventDefault();
    e.stopPropagation();
    setExpanded((prev) => !prev);
  }

  const badgeContent = (
    <div className="flex w-full items-center justify-between gap-1.5 sm:gap-2">
      {/* Zone Gauche : Icône + Libellé météo (aligné à gauche, tronqué proprement si très long) */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-start">
        <span className="text-[13px] sm:text-[14px] leading-none select-none flex-shrink-0" aria-hidden="true">
          {emoji}
        </span>
        <span
          className={`truncate text-[10.5px] sm:text-[11px] font-bold text-neutral-900 dark:text-white ${
            variant === "featured" ? "font-extrabold" : ""
          }`}
          title={weather.suitabilityLabel}
        >
          {weather.suitabilityLabel}
        </span>
      </div>

      {/* Zone Centrale : Température + Jauge de confort thermique */}
      {tempRange && (
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-shrink-0 px-1">
          <span className="text-[10.5px] sm:text-[11px] font-extrabold text-neutral-900 dark:text-violet-100 whitespace-nowrap">
            {tempRange}
          </span>
          <TemperatureGauge weather={weather} barWidth="w-5 sm:w-6" />
        </div>
      )}

      {/* Zone Droite : Score /10 + Chevron interactif (aligné à droite) */}
      <div className="flex items-center justify-end gap-1 sm:gap-1.5 flex-1 flex-shrink-0">
        <span
          className={`flex items-baseline gap-0.5 rounded-full px-2 py-0.5 whitespace-nowrap ${
            variant === "featured"
              ? "bg-black/[0.04] text-emerald-700 dark:bg-white/10 dark:text-emerald-300"
              : `bg-black/[0.03] dark:bg-white/[0.08] ${scoreColor}`
          }`}
        >
          <span className="font-display font-black text-xs leading-none">
            {weather.suitabilityScore}
          </span>
          <span className="text-[8.5px] font-bold text-neutral-500 dark:text-white/60">
            /10
          </span>
        </span>

        {canExpand && (
          <span
            className={`inline-flex items-center flex-shrink-0 transition-transform duration-200 ${
              expanded
                ? "rotate-180 text-violet-700 dark:text-violet-300"
                : "text-neutral-400 group-hover:text-neutral-700 dark:text-white/45 dark:group-hover:text-white"
            }`}
            aria-hidden="true"
          >
            <Icon name="chevDown" size={11} />
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col items-center w-full ${className}`}>
      {/* Clickable Badge Trigger - Responsive Full-Width Pill */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={!canExpand}
        title={
          canExpand
            ? expanded
              ? "Masquer les prévisions heure par heure"
              : "Toucher pour afficher les prévisions heure par heure sur la durée estimée"
            : undefined
        }
        aria-expanded={canExpand ? expanded : undefined}
        className={`group w-full max-w-full flex items-center justify-between rounded-full border px-3 py-1.5 sm:px-3.5 transition-all text-neutral-900 dark:text-white shadow-xs ${
          variant === "featured"
            ? "border-black/[0.08] bg-black/[0.03] backdrop-blur-sm dark:border-white/15 dark:bg-white/[0.06]"
            : "border-black/[0.07] bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.04]"
        } ${
          canExpand
            ? "cursor-pointer hover:border-violet-400 hover:bg-violet-500/10 active:scale-[0.99] dark:hover:border-violet-400/50"
            : ""
        } ${
          expanded
            ? "ring-2 ring-violet-500/40 dark:ring-violet-400/50 bg-violet-50/80 dark:bg-violet-950/40"
            : ""
        }`}
      >
        {badgeContent}
      </button>

      {/* Expanded Hourly Weather Panel */}
      {expanded && canExpand && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="mt-3 w-full overflow-hidden rounded-[22px] border border-black/[0.08] bg-white/95 p-3.5 shadow-md backdrop-blur-md transition-all dark:border-white/15 dark:bg-[#120822]/95 text-neutral-900 dark:text-white animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 border-b border-black/[0.06] pb-2.5 dark:border-white/[0.08]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                <Icon name="clock" size={12} />
              </span>
              <span className="text-[11.5px] font-black uppercase tracking-wider text-neutral-800 dark:text-violet-200 truncate">
                Météo sur le parcours
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExpanded(false);
              }}
              title="Fermer le détail heure par heure"
              className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 hover:bg-black/[0.05] hover:text-neutral-700 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Icon name="x" size={13} />
            </button>
          </div>

          {/* Timing Subtitle */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500 dark:text-white/50">
            <span className="font-medium">
              Créneau : <strong className="text-neutral-800 dark:text-violet-200">{departureTime} → {estimatedArrivalTime}</strong>
            </span>
            <span className="font-semibold text-neutral-600 dark:text-violet-300/80">
              ~{durationFormatted}
            </span>
          </div>

          {/* Horizontal Hour-by-Hour Cards (Horizontal Scroll with Snap) */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar scroll-smooth">
            {hourlySlots.map((slot, idx) => {
              const info = weatherCodeInfo(slot.weatherCode);
              const temp = Math.round(slot.temperatureC);
              const rain = slot.precipitationProbability ?? 0;
              const isFirst = idx === 0;
              const isLast = idx === hourlySlots.length - 1;

              // Color-coded rain risk badge
              const rainBadgeStyle =
                rain >= 40
                  ? "bg-rose-100 text-rose-800 font-black border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700/60"
                  : rain >= 20
                  ? "bg-amber-100 text-amber-800 font-extrabold border-amber-300/80 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700/50"
                  : rain > 10
                  ? "bg-sky-100 text-sky-800 font-bold border-sky-300/80 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-700/50"
                  : "bg-black/[0.04] text-neutral-600 font-medium border-transparent dark:bg-white/[0.06] dark:text-white/60";

              return (
                <div
                  key={slot.time || idx}
                  className={`flex flex-col items-center justify-between rounded-2xl border p-2.5 min-w-[76px] sm:min-w-[82px] flex-1 text-center transition-all ${
                    isFirst
                      ? "border-emerald-500/30 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-950/20"
                      : isLast
                      ? "border-violet-500/30 bg-violet-50/50 dark:border-violet-500/30 dark:bg-violet-950/20"
                      : "border-black/[0.06] bg-neutral-50/90 dark:border-white/10 dark:bg-white/[0.04]"
                  }`}
                >
                  {/* Slot time + tag */}
                  <div className="flex flex-col items-center">
                    <span className="text-[12px] font-black tracking-tight text-neutral-900 dark:text-white">
                      {slot.time ? slot.time.replace(":", "h") : `${slot.hour}h`}
                    </span>
                    {isFirst ? (
                      <span className="mt-0.5 rounded px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-300/60 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-600/40">
                        Départ
                      </span>
                    ) : isLast ? (
                      <span className="mt-0.5 rounded px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider text-violet-800 bg-violet-100 border border-violet-300/60 dark:bg-violet-950/80 dark:text-violet-300 dark:border-violet-600/40">
                        Arrivée
                      </span>
                    ) : (
                      <span className="mt-0.5 text-[8.5px] font-semibold text-neutral-400 dark:text-white/40">
                        +{idx}h
                      </span>
                    )}
                  </div>

                  {/* Weather Icon / Emoji & Label */}
                  <div className="my-2 flex flex-col items-center gap-0.5">
                    <span
                      className="text-2xl leading-none select-none drop-shadow-xs"
                      aria-hidden="true"
                      title={info.label}
                    >
                      {info.emoji}
                    </span>
                    <span className="text-[9.5px] font-bold text-neutral-600 dark:text-white/70 max-w-[74px] truncate leading-tight">
                      {info.label}
                    </span>
                  </div>

                  {/* Temperature */}
                  <div className="my-0.5">
                    <span className="font-display text-[17px] font-black leading-none text-neutral-950 dark:text-white">
                      {temp}°
                    </span>
                  </div>

                  {/* Rain risk % */}
                  <div
                    className={`mt-1.5 flex items-center justify-center gap-0.5 rounded-lg border px-1.5 py-0.5 text-[10px] ${rainBadgeStyle}`}
                    title={`Risque de pluie : ${rain}%`}
                  >
                    <span className="text-[9.5px]" aria-hidden="true">
                      💧
                    </span>
                    <span>{rain}%</span>
                  </div>

                  {/* Wind (Speed in km/h) */}
                  {slot.windSpeedKmh !== undefined && (
                    <div className="mt-1 flex items-center justify-center gap-0.5 text-[9px] font-medium text-neutral-500 dark:text-white/45">
                      <span>💨</span>
                      <span>{slot.windSpeedKmh}</span>
                      <span className="text-[7.5px]">km/h</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Advice / Summary note */}
          {weather.suitabilitySummary && (
            <div className="mt-2.5 flex items-start gap-1.5 rounded-xl border border-black/[0.05] bg-black/[0.02] px-3 py-2 text-[11px] font-semibold text-neutral-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/80">
              <span className="text-xs select-none flex-shrink-0 mt-0.5">💡</span>
              <span className="leading-snug">{weather.suitabilitySummary}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
