import { fmtWeatherTempRange, getWeatherEmoji, type RideWeather } from "@/lib/weather";
import { TemperatureGauge } from "./TemperatureGauge";

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
  if (!weather || weather.suitabilityScore === undefined) return null;

  const emoji = getWeatherEmoji(weather);
  const color = weather.suitabilityBadgeColor || "green";
  const scoreColor = SCORE_COLORS[color];
  const tempRange = fmtWeatherTempRange(weather);

  if (variant === "featured") {
    return (
      <div
        className={`inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-black/[0.04] px-3 py-1 text-neutral-900 backdrop-blur-sm shadow-xs dark:border-white/20 dark:bg-white/10 dark:text-white ${className}`}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] leading-none select-none" aria-hidden="true">
            {emoji}
          </span>
          <span className="text-[11px] font-bold text-neutral-900 dark:text-white whitespace-nowrap">
            {weather.suitabilityLabel}
          </span>
        </div>
        {tempRange && (
          <>
            <span className="text-black/30 dark:text-white/30 text-[10px]">·</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-extrabold text-neutral-900 dark:text-violet-100 whitespace-nowrap">
                {tempRange}
              </span>
              <TemperatureGauge weather={weather} barWidth="w-9" />
            </div>
          </>
        )}
        <span className="text-black/30 dark:text-white/30 text-[10px]">·</span>
        <span className="flex items-baseline gap-0.5 text-[11px] font-bold whitespace-nowrap">
          <span className="font-display font-black text-xs text-emerald-700 dark:text-emerald-300">
            {weather.suitabilityScore}
          </span>
          <span className="text-[9px] text-neutral-500 dark:text-violet-200/60">/10</span>
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-black/[0.08] bg-black/[0.03] px-2.5 py-1 text-black/80 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/80 ${className}`}
    >
      <div className="flex items-center gap-1">
        <span className="text-[12px] leading-none select-none" aria-hidden="true">
          {emoji}
        </span>
        <span className="text-[10.5px] font-bold whitespace-nowrap">
          {weather.suitabilityLabel}
        </span>
      </div>
      {tempRange && (
        <>
          <span className="opacity-30 text-[9px]">·</span>
          <div className="flex items-center gap-1">
            <span className="text-[10.5px] font-extrabold whitespace-nowrap">
              {tempRange}
            </span>
            <TemperatureGauge weather={weather} barWidth="w-8" />
          </div>
        </>
      )}
      <span className="opacity-30 text-[9px]">·</span>
      <span className="flex items-baseline gap-0.5 text-[10.5px] font-bold whitespace-nowrap">
        <span className={`font-display font-black text-xs ${scoreColor}`}>
          {weather.suitabilityScore}
        </span>
        <span className="text-[8.5px] opacity-50">/10</span>
      </span>
    </div>
  );
}
