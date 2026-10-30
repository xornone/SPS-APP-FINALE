import { interpolateWeatherAtProgress, type PointWeather, type RideWeather } from "./weather";

export interface ActiveScrub {
  progress: number; // 0 à 1
  index: number;
  distanceKm: number;
  elevationM: number;
  slopePercent: number;
  point: [number, number] | null; // [lat, lng]
  mapLabel: string;
  weather: PointWeather | null;
}

/**
 * Calcule l'état de survol / scrub pour la synchronisation entre la courbe de dénivelé,
 * la carte et le widget météo.
 */
export function computeScrubAtProgress(
  progress: number,
  elevations: number[] | null | undefined,
  points: [number, number][] | null | undefined,
  totalDistanceKm: number,
  weather: RideWeather | null | undefined
): ActiveScrub | null {
  if (!elevations || elevations.length < 2) return null;

  const clamped = Math.max(0, Math.min(1, progress));
  const count = elevations.length;
  const index = Math.min(count - 1, Math.round(clamped * (count - 1)));
  const elevationM = Math.round(elevations[index]);
  const distanceKm = Number((clamped * (totalDistanceKm || 0)).toFixed(1));

  // Pente locale (%) calculée sur une fenêtre de quelques points autour de l'indice
  const windowRadius = Math.max(1, Math.min(8, Math.floor(count / 40)));
  const iLow = Math.max(0, index - windowRadius);
  const iHigh = Math.min(count - 1, index + windowRadius);
  const dEle = elevations[iHigh] - elevations[iLow];
  const dDistM = ((iHigh - iLow) / (count - 1)) * ((totalDistanceKm || 1) * 1000);
  const slopePercent = dDistM > 10 ? Number(((dEle / dDistM) * 100).toFixed(1)) : 0;

  const point = points && points[index] ? points[index] : null;
  const pointWeather = interpolateWeatherAtProgress(weather, clamped);

  const timeStr = pointWeather ? ` · ${pointWeather.time}` : "";
  const mapLabel = `km ${distanceKm} · ${elevationM} m${timeStr}`;

  return {
    progress: clamped,
    index,
    distanceKm,
    elevationM,
    slopePercent,
    point,
    mapLabel,
    weather: pointWeather,
  };
}
