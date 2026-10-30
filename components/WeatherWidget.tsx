import { weatherCodeInfo, windDirectionLabel, type RideWeather } from "@/lib/weather";
import type { ActiveScrub } from "@/lib/scrub";
import { Icon } from "./Icons";

const THEMES: Record<
  NonNullable<RideWeather["suitabilityBadgeColor"]>,
  {
    bg: string;
    border: string;
    badgeBg: string;
    scoreText: string;
  }
> = {
  emerald: {
    bg: "from-emerald-500/15 via-teal-500/10 to-emerald-500/5 dark:from-emerald-400/20 dark:via-teal-400/15 dark:to-emerald-400/10",
    border: "border-emerald-500/30 dark:border-emerald-400/30",
    badgeBg: "bg-emerald-600 text-white dark:bg-emerald-500",
    scoreText: "text-emerald-600 dark:text-emerald-400",
  },
  green: {
    bg: "from-green-500/15 via-emerald-500/10 to-green-500/5 dark:from-green-400/20 dark:via-emerald-400/15 dark:to-green-400/10",
    border: "border-green-500/30 dark:border-green-400/30",
    badgeBg: "bg-green-600 text-white dark:bg-green-500",
    scoreText: "text-green-600 dark:text-green-400",
  },
  blue: {
    bg: "from-sky-500/15 via-blue-500/10 to-sky-500/5 dark:from-sky-400/20 dark:via-blue-400/15 dark:to-sky-400/10",
    border: "border-sky-500/30 dark:border-sky-400/30",
    badgeBg: "bg-sky-600 text-white dark:bg-sky-500",
    scoreText: "text-sky-600 dark:text-sky-400",
  },
  amber: {
    bg: "from-amber-500/15 via-yellow-500/10 to-amber-500/5 dark:from-amber-400/20 dark:via-yellow-400/15 dark:to-amber-400/10",
    border: "border-amber-500/30 dark:border-amber-400/30",
    badgeBg: "bg-amber-600 text-white dark:bg-amber-500",
    scoreText: "text-amber-600 dark:text-amber-400",
  },
  orange: {
    bg: "from-orange-500/15 via-amber-500/10 to-orange-500/5 dark:from-orange-400/20 dark:via-amber-400/15 dark:to-orange-400/10",
    border: "border-orange-500/30 dark:border-orange-400/30",
    badgeBg: "bg-orange-600 text-white dark:bg-orange-500",
    scoreText: "text-orange-600 dark:text-orange-400",
  },
  rose: {
    bg: "from-rose-500/15 via-red-500/10 to-rose-500/5 dark:from-rose-400/20 dark:via-red-400/15 dark:to-rose-400/10",
    border: "border-rose-500/30 dark:border-rose-400/30",
    badgeBg: "bg-rose-600 text-white dark:bg-rose-500",
    scoreText: "text-rose-600 dark:text-rose-400",
  },
};

export function WeatherWidget({
  weather,
  activeScrub,
  onResetScrub,
}: {
  weather: RideWeather | null;
  activeScrub?: ActiveScrub | null;
  onResetScrub?: () => void;
}) {
  if (!weather) return null;

  const scrubWeather = activeScrub?.weather;
  const sky = scrubWeather
    ? weatherCodeInfo(scrubWeather.weatherCode)
    : weatherCodeInfo(weather.dominantWeatherCode ?? weather.weatherCode);
  const theme = THEMES[weather.suitabilityBadgeColor || "green"];

  // Métriques dynamiques : s'adaptent en direct au point de survol
  const tempValue = scrubWeather
    ? `${scrubWeather.temperatureC}°`
    : weather.tempMin !== undefined && weather.tempMax !== undefined && weather.tempMin !== weather.tempMax
    ? `${weather.tempMin}° → ${weather.tempMax}°`
    : `${weather.temperatureC}°`;

  const tempLabel = scrubWeather
    ? `À ${scrubWeather.time}`
    : weather.tempMin !== weather.tempMax
    ? "Départ → Arrivée"
    : "Température";

  const rainValue = scrubWeather
    ? `${scrubWeather.precipitationProbability}%`
    : `${weather.maxPrecipitationProbability ?? weather.precipitationProbability}%`;

  const windSpeedValue = scrubWeather
    ? `${scrubWeather.windSpeedKmh} km/h`
    : weather.maxWindSpeedKmh && weather.maxWindSpeedKmh > weather.windSpeedKmh
    ? `${weather.windSpeedKmh}–${weather.maxWindSpeedKmh} km/h`
    : `${weather.windSpeedKmh} km/h`;

  const windDirDeg = scrubWeather ? scrubWeather.windDirectionDeg : weather.windDirectionDeg;

  return (
    <div className="px-5 pb-3">
      <div className="rounded-2xl border border-black/[0.06] bg-white p-3.5 shadow-cardSm dark:border-white/10 dark:bg-[#1A1422]">
        {/* En-tête compact avec Statut, Note et Résumé */}
        {weather.suitabilityScore !== undefined && (
          <div className="mb-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Icon name={sky.icon} size={15} className="text-sps-violet600 dark:text-sps-violet400" />
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide ${theme.badgeBg}`}>
                  {weather.suitabilityLabel}
                </span>
              </div>
              <div className="flex items-baseline gap-1 rounded-full bg-black/[0.04] px-2.5 py-0.5 dark:bg-white/[0.06]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40">Note</span>
                <span className={`font-display text-[15px] font-black leading-none ${theme.scoreText}`}>
                  {weather.suitabilityScore}
                </span>
                <span className="text-[10px] font-bold text-black/35 dark:text-white/35">/10</span>
              </div>
            </div>

            {weather.suitabilitySummary && (
              <p className="mt-1.5 text-[11.5px] leading-snug text-black/65 dark:text-white/70">
                {weather.suitabilitySummary}
              </p>
            )}
          </div>
        )}

        {/* Indicateur de survol actif */}
        {activeScrub && scrubWeather && (
          <div className="mb-2.5 flex items-center justify-between rounded-xl bg-sps-violet600/10 px-3 py-1.5 text-xs text-sps-violet700 dark:bg-sps-violet400/15 dark:text-sps-violet300">
            <span className="flex items-center gap-1.5 font-bold">
              <span className="h-2 w-2 rounded-full bg-sps-violet500 animate-pulse" />
              <span>Au km {activeScrub.distanceKm} (~{scrubWeather.time})</span>
            </span>
            {onResetScrub && (
              <button
                type="button"
                onClick={onResetScrub}
                className="text-[10.5px] font-semibold underline underline-offset-2 opacity-80 hover:opacity-100"
              >
                Vue globale ✕
              </button>
            )}
          </div>
        )}

        {/* Grille des 4 métriques synchronisées */}
        <div className="grid grid-cols-4 gap-2">
          <WeatherStat
            icon={<Icon name="sun" size={17} className="text-sps-violet600 dark:text-sps-violet400" />}
            value={tempValue}
            label={tempLabel}
          />
          <WeatherStat
            icon={<Icon name="rain" size={17} className="text-sps-violet600 dark:text-sps-violet400" />}
            value={rainValue}
            label="Risque pluie"
          />
          <WeatherStat
            icon={<Icon name={sky.icon} size={17} className="text-sps-violet600 dark:text-sps-violet400" />}
            value={sky.label}
            label="Ciel"
          />
          <WeatherStat
            icon={
              <span
                className="inline-block transition-transform duration-200"
                style={{ transform: `rotate(${windDirDeg}deg)` }}
              >
                <Icon name="arrowUp" size={17} className="text-sps-violet600 dark:text-sps-violet400" />
              </span>
            }
            value={windSpeedValue}
            label={`Vent ${windDirectionLabel(windDirDeg)}`}
          />
        </div>
      </div>
    </div>
  );
}

function WeatherStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-black/[0.02] py-2.5 text-center dark:bg-white/[0.04]">
      <div className="flex h-[18px] items-center justify-center">{icon}</div>
      <span className="font-display text-[13px] leading-none">{value}</span>
      <span className="text-[9px] uppercase leading-tight tracking-wide text-black/40 dark:text-white/40">
        {label}
      </span>
    </div>
  );
}
