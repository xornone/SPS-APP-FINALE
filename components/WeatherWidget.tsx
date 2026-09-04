import { weatherCodeInfo, windDirectionLabel, type RideWeather } from "@/lib/weather";
import { Icon } from "./Icons";

// Purement presentation : la meteo est deja resolue par la page (qui la
// reutilise aussi pour le message WhatsApp, voir buildRideShareMessage).
// Si aucune prevision n'est disponible (sortie trop loin dans le temps,
// lieu non geolocalisable...), le widget est simplement omis.
export function WeatherWidget({ weather }: { weather: RideWeather | null }) {
  if (!weather) return null;

  const sky = weatherCodeInfo(weather.weatherCode);

  return (
    <div className="px-5 pb-4">
      <div className="rounded-2xl border border-black/[0.06] bg-white p-4 dark:border-white/10 dark:bg-[#1A1422]">
        <div className="mb-3 flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide text-black/45 dark:text-white/45">
          <Icon name={sky.icon} size={14} className="text-sps-violet600 dark:text-sps-violet400" />
          Météo prévue — {sky.label}
        </div>
        <div className="grid grid-cols-4 gap-2">
          <WeatherStat
            icon={<Icon name="sun" size={18} className="text-sps-violet600 dark:text-sps-violet400" />}
            value={`${weather.temperatureC}°`}
            label="Température"
          />
          <WeatherStat
            icon={<Icon name="rain" size={18} className="text-sps-violet600 dark:text-sps-violet400" />}
            value={`${weather.precipitationProbability}%`}
            label="Risque pluie"
          />
          <WeatherStat
            icon={<Icon name={sky.icon} size={18} className="text-sps-violet600 dark:text-sps-violet400" />}
            value={sky.label}
            label="Ciel"
          />
          <WeatherStat
            icon={
              <span
                className="inline-block"
                style={{ transform: `rotate(${weather.windDirectionDeg}deg)` }}
              >
                <Icon name="arrowUp" size={18} className="text-sps-violet600 dark:text-sps-violet400" />
              </span>
            }
            value={`${weather.windSpeedKmh} km/h`}
            label={`Vent ${windDirectionLabel(weather.windDirectionDeg)}`}
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
