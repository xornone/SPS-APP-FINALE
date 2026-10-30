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
  const hasTwoTiers = Boolean(tempRange);
  const capsuleShape = hasTwoTiers ? "rounded-2xl" : "rounded-full";

  if (variant === "featured") {
    return (
      <div
        className={`inline-flex flex-col gap-1 ${capsuleShape} border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-sm text-white ${className}`}
      >
        {/* Étage 1 : Température et Jauge thermique */}
        {tempRange && (
          <div className="flex items-center justify-between gap-2.5">
            <span className="text-[11.5px] font-extrabold text-violet-100 tracking-tight">
              {tempRange}
            </span>
            <TemperatureGauge weather={weather} barWidth="w-12" />
          </div>
        )}

        {/* Étage 2 : Conditions météo & Note sur 10 */}
        <div className="flex items-center justify-between gap-2.5 text-[11px] font-bold">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] leading-none select-none" aria-hidden="true">
              {emoji}
            </span>
            <span>{weather.suitabilityLabel}</span>
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="font-display font-black text-[13.5px] leading-none text-emerald-300">
              {weather.suitabilityScore}
            </span>
            <span className="text-[9.5px] font-semibold text-violet-200/70">/10</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex flex-col gap-1 ${capsuleShape} border border-black/[0.07] bg-black/[0.03] px-3 py-1.5 dark:border-white/10 dark:bg-white/[0.05] ${className}`}
    >
      {/* Étage 1 : Température et Jauge thermique */}
      {tempRange && (
        <div className="flex items-center justify-between gap-2.5">
          <span className="text-[11.5px] font-extrabold text-black/85 dark:text-white/90 tracking-tight">
            {tempRange}
          </span>
          <TemperatureGauge weather={weather} barWidth="w-12" />
        </div>
      )}

      {/* Étage 2 : Conditions météo & Note sur 10 */}
      <div className="flex items-center justify-between gap-2.5 text-[11px] font-bold text-black/75 dark:text-white/80">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] leading-none select-none" aria-hidden="true">
            {emoji}
          </span>
          <span>{weather.suitabilityLabel}</span>
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className={`font-display font-black text-[13.5px] leading-none ${scoreColor}`}>
            {weather.suitabilityScore}
          </span>
          <span className="text-[9.5px] font-medium opacity-50">/10</span>
        </div>
      </div>
    </div>
  );
}
