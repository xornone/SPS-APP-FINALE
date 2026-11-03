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
    <>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[12.5px] leading-none select-none" aria-hidden="true">
          {emoji}
        </span>
        <span
          className={
            variant === "featured"
              ? "text-[11px] font-bold text-neutral-900 dark:text-white whitespace-nowrap"
              : "text-[10.5px] font-bold whitespace-nowrap"
          }
        >
          {weather.suitabilityLabel}
        </span>
      </div>

      {tempRange && (
        <>
          <span
            className={
              variant === "featured"
                ? "text-black/30 dark:text-white/30 text-[10px] flex-shrink-0"
                : "opacity-30 text-[9px] flex-shrink-0"
            }
          >
            ·
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span
              className={
                variant === "featured"
                  ? "text-[11px] font-extrabold text-neutral-900 dark:text-violet-100 whitespace-nowrap"
                  : "text-[10.5px] font-extrabold whitespace-nowrap"
              }
            >
              {tempRange}
            </span>
            <TemperatureGauge weather={weather} barWidth="w-6" />
          </div>
        </>
      )}

      <span
        className={
          variant === "featured"
            ? "text-black/30 dark:text-white/30 text-[10px] flex-shrink-0"
            : "opacity-30 text-[9px] flex-shrink-0"
        }
      >
        ·
      </span>

      <span className="flex items-baseline gap-0.5 whitespace-nowrap flex-shrink-0">
        <span
          className={`font-display font-black text-xs ${
            variant === "featured" ? "text-emerald-700 dark:text-emerald-300" : scoreColor
          }`}
        >
          {weather.suitabilityScore}
        </span>
        <span
          className={
            variant === "featured"
              ? "text-[9px] text-neutral-500 dark:text-violet-200/60"
              : "text-[8.5px] opacity-50"
          }
        >
          /10
        </span>
      </span>

      {canExpand && (
        <span
          className={`ml-0.5 inline-flex items-center flex-shrink-0 transition-transform duration-200 ${
            expanded
              ? "rotate-180 text-violet-700 dark:text-violet-300"
              : "text-neutral-400 group-hover:text-neutral-700 dark:text-white/45 dark:group-hover:text-white"
          }`}
          aria-hidden="true"
        >
          <Icon name="chevDown" size={11} />
        </span>
      )}
    </>
  );

  return (
    <div className={`flex flex-col items-center w-full ${className}`}>
      {/* Clickable Badge Trigger */}
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
        className={
          variant === "featured"
            ? `group inline-flex flex-nowrap items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-black/[0.08] bg-black/[0.04] px-3 py-1 text-neutral-900 backdrop-blur-sm shadow-xs transition-all dark:border-white/20 dark:bg-white/10 dark:text-white ${
                canExpand
                  ? "cursor-pointer hover:border-violet-400 hover:bg-violet-500/10 active:scale-[0.98] dark:hover:border-violet-400/50"
                  : ""
              } ${
                expanded
                  ? "ring-2 ring-violet-500/40 dark:ring-violet-400/50 bg-violet-50/80 dark:bg-violet-950/40"
                  : ""
              }`
            : `group inline-flex flex-nowrap items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-black/[0.08] bg-black/[0.03] px-2.5 py-1 text-black/80 transition-all dark:border-white/10 dark:bg-white/[0.05] dark:text-white/80 ${
                canExpand
                  ? "cursor-pointer hover:border-violet-400 hover:bg-violet-500/10 active:scale-[0.98] dark:hover:border-violet-400/50"
                  : ""
              } ${
                expanded
                  ? "ring-2 ring-violet-500/40 dark:ring-violet-400/50 bg-violet-50/80 dark:bg-violet-950/40"
                  : ""
              }`
        }
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
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-black/[0.04] text-neutral-500 transition hover:bg-black/[0.08] hover:text-neutral-900 active:scale-95 dark:border-white/10 dark:bg-white/10 dark:text-neutral-300 dark:hover:bg-white/20 dark:hover:text-white"
            >
              <Icon name="x" size={12} />
            </button>
          </div>

          {/* Ride timing & estimated duration pill */}
          <div className="mt-2.5 mb-3 flex items-center justify-between gap-2 rounded-xl bg-violet-500/[0.08] px-3 py-1.5 border border-violet-500/20 dark:bg-violet-500/15 dark:border-violet-400/25">
            <span className="text-[11px] font-bold text-neutral-700 dark:text-violet-100">
              ⏱️ Créneau estimé :{" "}
              <strong className="font-extrabold text-neutral-950 dark:text-white">
                {departureTime} → {estimatedArrivalTime}
              </strong>
            </span>
            <span className="rounded-md bg-violet-600/15 px-2 py-0.5 text-[10.5px] font-black text-violet-800 dark:bg-violet-400/20 dark:text-violet-200 flex-shrink-0">
              ~{durationFormatted}
            </span>
          </div>

          {/* Horizontal scrollable hourly forecast cards */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5 -mx-1 px-1">
            {hourlySlots.map((slot, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === hourlySlots.length - 1;
              const info = weatherCodeInfo(slot.weatherCode);
              const rain = slot.precipitationProbability ?? 0;
              const temp = slot.temperatureC ?? 0;

              const rainBadgeStyle =
                rain >= 60
                  ? "bg-rose-100 text-rose-700 font-black border-rose-300/80 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-700/50"
                  : rain >= 30
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
