import type { RideWeather } from "@/lib/weather";

export const SCALE_MIN = 0; // 0°C = trop froid / gel
export const SCALE_MAX = 36; // 36°C = trop chaud / canicule

/**
 * Calcule la position et largeur du curseur sur l'échelle thermique [0°C, 36°C].
 * Garantit que le curseur ne déborde jamais du rail (0% <= left + width <= 100%).
 */
export function computeTemperatureGaugePosition(weather?: Pick<RideWeather, "tempMin" | "tempMax" | "temperatureC"> | null): {
  leftPct: number;
  widthPct: number;
  rawMin: number;
  rawMax: number;
} | null {
  if (!weather) return null;
  const rawMin = weather.tempMin ?? weather.temperatureC;
  const rawMax = weather.tempMax ?? weather.temperatureC ?? rawMin;
  if (rawMin === undefined) return null;

  const cMin = Math.max(SCALE_MIN, Math.min(SCALE_MAX, rawMin));
  const cMax = Math.max(SCALE_MIN, Math.min(SCALE_MAX, rawMax));

  const minPct = Math.round(((cMin - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100);
  const maxPct = Math.round(((cMax - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100);

  const widthPct = Math.max(8, maxPct - minPct);
  const leftPct = Math.min(minPct, 100 - widthPct);

  return { leftPct, widthPct, rawMin, rawMax };
}

/**
 * Jauge de confort thermique cycliste du trop froid (❄️ 0°C) au trop chaud (🔥 36°C).
 * Affiche un curseur lumineux blanc sur un dégradé continu bleu -> vert -> rouge.
 */
export function TemperatureGauge({
  weather,
  className = "",
  barWidth = "w-11",
}: {
  weather: RideWeather | null | undefined;
  className?: string;
  barWidth?: string;
}) {
  const pos = computeTemperatureGaugePosition(weather);
  if (!pos) return null;

  const { leftPct, widthPct, rawMin, rawMax } = pos;

  return (
    <div
      className={`inline-flex items-center gap-1 select-none ${className}`}
      title={`Échelle de confort thermique : 0°C (trop froid) à 36°C (trop chaud) · Sortie : ${rawMin}° → ${rawMax}°`}
      aria-label={`Jauge de température de ${rawMin}° à ${rawMax}°`}
    >
      <span className="text-[9px] leading-none opacity-75" aria-hidden="true" title="Trop froid (0°C)">
        ❄️
      </span>
      <div className={`relative h-[4.5px] ${barWidth} rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-rose-500 shadow-inner`}>
        {/* Curseur de température actif */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-[2px] h-[8.5px] rounded-full border border-black/30 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] dark:border-white/60"
          style={{
            left: `${leftPct}%`,
            width: `${widthPct}%`,
          }}
        />
      </div>
      <span className="text-[9px] leading-none opacity-75" aria-hidden="true" title="Trop chaud (36°C)">
        🔥
      </span>
    </div>
  );
}
