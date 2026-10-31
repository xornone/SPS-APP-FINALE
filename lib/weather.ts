// Widget météo pour la fiche sortie : utilise Open-Meteo (API gratuite,
// sans clé) pour récupérer les prévisions horaires sur toute la durée de la sortie
// (de l'heure de départ à l'heure d'arrivée estimée).
// Calcule également une "note de bien-séance" sur 10 évaluant le confort cycliste
// (température, vent, risque de pluie, ciel).

import type { GroupLevel } from "./types";

export interface RideWeatherHour {
  time: string; // "09:00"
  hour: number; // 9
  temperatureC: number;
  precipitationProbability: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  weatherCode: number;
}

export interface RideWeatherParams {
  distanceKm?: number;
  elevationGainM?: number;
  groups?: GroupLevel[];
}

export interface RideWeather {
  // Snapshot au départ (rétro-compatible)
  temperatureC: number;
  precipitationProbability: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  weatherCode: number;

  // Créneau horaire & durée estimée
  departureTime?: string; // "09:00"
  estimatedArrivalTime?: string; // "11:45"
  durationMinutes?: number; // 165
  durationFormatted?: string; // "2h45"

  // Données agrégées sur toute la sortie
  tempMin?: number;
  tempMax?: number;
  avgTemp?: number;
  maxPrecipitationProbability?: number;
  maxWindSpeedKmh?: number;
  avgWindSpeedKmh?: number;
  dominantWeatherCode?: number;

  // Note de bien-séance sur 10 (confort cycliste global)
  suitabilityScore?: number; // e.g. 9.2
  suitabilityLabel?: string; // e.g. "Conditions idéales"
  suitabilitySummary?: string; // e.g. "Fraîcheur au départ (8°), douceur (16°) · Zéro pluie · Vent calme"
  suitabilityBadgeColor?: "emerald" | "green" | "blue" | "amber" | "orange" | "rose";

  // Détail heure par heure pendant la sortie
  hourlySlots?: RideWeatherHour[];
}

/**
 * Estime la durée d'une sortie en minutes selon la distance, le D+ et les groupes.
 */
export function estimateRideDurationMinutes(
  distanceKm?: number,
  elevationGainM?: number,
  groups?: GroupLevel[]
): number {
  if (!distanceKm || distanceKm <= 0) return 120; // 2h par défaut

  // Vitesses moyennes indicatives par groupe SPS
  const groupSpeeds: Record<GroupLevel, number> = { vert: 25, rouge: 27, violet: 29.5 };
  let speed = 26;
  if (groups && groups.length > 0) {
    const validSpeeds = groups.map((g) => groupSpeeds[g]).filter(Boolean);
    if (validSpeeds.length > 0) {
      speed = validSpeeds.reduce((a, b) => a + b, 0) / validSpeeds.length;
    }
  }

  // Temps de roulage de base
  const ridingHours = distanceKm / speed;
  // Départ réel ~5 min après l'heure de rdv (rassemblement / consignes / briefing)
  const startDelayMinutes = 5;
  // Petite marge pour feux / regroupements / pause (5 min par tranche de 40 km)
  const pauseMinutes = Math.min(25, Math.floor(distanceKm / 40) * 5) + startDelayMinutes;
  // Arrondi au pas de 5 minutes
  return Math.max(30, Math.round((ridingHours * 60 + pauseMinutes) / 5) * 5);
}

/**
 * Ajoute un nombre de minutes à une chaîne "HH:MM" ou "HH:MM:SS" et renvoie "HH:MM".
 */
export function addMinutesToTimeString(timeStr: string, minutesToAdd: number): string {
  const parts = String(timeStr || "09:00").split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  const totalM = h * 60 + m + minutesToAdd;
  const newH = Math.floor(totalM / 60) % 24;
  const newM = totalM % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export interface PointWeather {
  time: string;
  temperatureC: number;
  precipitationProbability: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  weatherCode: number;
  slotIndex: number;
}

/**
 * Interpole les conditions météo prévues à un avancement précis de la sortie (0.0 = départ, 1.0 = arrivée).
 */
export function interpolateWeatherAtProgress(
  weather: RideWeather | null | undefined,
  progress: number
): PointWeather | null {
  if (!weather) return null;
  const clamped = Math.max(0, Math.min(1, progress));
  const durationMinutes = weather.durationMinutes || 120;
  const elapsedMinutes = Math.round(clamped * durationMinutes);
  const time = addMinutesToTimeString(weather.departureTime || "09:00", elapsedMinutes);

  const slots = weather.hourlySlots;
  if (!slots || slots.length === 0) {
    return {
      time,
      temperatureC: weather.temperatureC,
      precipitationProbability: weather.precipitationProbability,
      windSpeedKmh: weather.windSpeedKmh,
      windDirectionDeg: weather.windDirectionDeg,
      weatherCode: weather.weatherCode,
      slotIndex: 0,
    };
  }

  if (slots.length === 1) {
    return {
      time,
      temperatureC: slots[0].temperatureC,
      precipitationProbability: slots[0].precipitationProbability,
      windSpeedKmh: slots[0].windSpeedKmh,
      windDirectionDeg: slots[0].windDirectionDeg,
      weatherCode: slots[0].weatherCode,
      slotIndex: 0,
    };
  }

  const rawSlotIdx = clamped * (slots.length - 1);
  const idxLow = Math.floor(rawSlotIdx);
  const idxHigh = Math.min(slots.length - 1, Math.ceil(rawSlotIdx));
  const frac = rawSlotIdx - idxLow;

  const low = slots[idxLow];
  const high = slots[idxHigh];

  const temperatureC = Math.round(low.temperatureC + (high.temperatureC - low.temperatureC) * frac);
  const precipitationProbability = Math.round(
    low.precipitationProbability + (high.precipitationProbability - low.precipitationProbability) * frac
  );
  const windSpeedKmh = Math.round(low.windSpeedKmh + (high.windSpeedKmh - low.windSpeedKmh) * frac);
  const windDirectionDeg = Math.round(
    low.windDirectionDeg + (high.windDirectionDeg - low.windDirectionDeg) * frac
  );
  const weatherCode = frac < 0.5 ? low.weatherCode : high.weatherCode;
  const slotIndex = frac < 0.5 ? idxLow : idxHigh;

  return {
    time,
    temperatureC,
    precipitationProbability,
    windSpeedKmh,
    windDirectionDeg,
    weatherCode,
    slotIndex,
  };
}

/**
 * Évalue la gravité d'un code météo (pour sélectionner le ciel dominant le plus impactant pour le vélo).
 */
function codeSeverity(code: number): number {
  if ([95, 96, 99].includes(code)) return 6; // Orage
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 5; // Neige
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 4; // Pluie
  if ([51, 53, 55, 56, 57].includes(code)) return 3; // Bruine
  if (code === 45 || code === 48) return 2; // Brouillard
  if (code === 3) return 1; // Couvert
  return 0; // Ciel dégagé / éclaircies
}

/**
 * Calcule une note sur 10 de bien-séance cycliste adaptée à l'ensemble du créneau.
 */
export function computeSuitabilityScore(
  slots: RideWeatherHour[]
): {
  score: number;
  label: string;
  summary: string;
  badgeColor: "emerald" | "green" | "blue" | "amber" | "orange" | "rose";
} {
  if (!slots.length) {
    return {
      score: 8.0,
      label: "Conditions normales",
      summary: "Données prévisionnelles partielles",
      badgeColor: "green",
    };
  }

  let score = 10.0;
  const avgTemp = slots.reduce((s, x) => s + x.temperatureC, 0) / slots.length;
  const tempMin = Math.min(...slots.map((x) => x.temperatureC));
  const tempMax = Math.max(...slots.map((x) => x.temperatureC));
  const maxPrecip = Math.max(...slots.map((x) => x.precipitationProbability));
  const maxWind = Math.max(...slots.map((x) => x.windSpeedKmh));

  // 1. Température minimale au départ & fraîcheur (effet windchill à vélo à 30 km/h)
  if (tempMin < 0) {
    score -= 5.0; // grand froid / gel
  } else if (tempMin < 5) {
    score -= 3.5; // froid piquant (< 5°)
  } else if (tempMin < 8) {
    score -= 2.4; // très frais (5° à 7°)
  } else if (tempMin < 11) {
    score -= 2.0; // frais (8° à 10°) -> recalibre les départs à 9° sous 8.0/10
  } else if (tempMin < 13) {
    score -= 1.0; // départ un peu frais (11° à 12°)
  } else if (tempMin < 15) {
    score -= 0.4; // départ doux (13° à 14°)
  }

  // 1b. Moyenne de température sur le créneau
  if (avgTemp < 12) {
    score -= 0.6;
  } else if (avgTemp < 15) {
    score -= 0.4;
  }

  // 1c. Forte chaleur (>= 30°C c'est chaud, 27°C c'est ok)
  if (tempMax >= 38) {
    score -= 5.5; // canicule extrême
  } else if (tempMax >= 35) {
    score -= 4.2; // canicule (35° à 37°) -> note <= 5.8
  } else if (tempMax >= 32) {
    score -= 3.0; // très chaud (32° à 34°)
  } else if (tempMax >= 30) {
    score -= 2.0; // chaud (30° à 31°) -> note ~7.5-8.0
  } else if (tempMax > 28) {
    score -= 0.6; // chaleur modérée
  }

  // 2. Pluie / Précipitations
  if (maxPrecip > 10) {
    if (maxPrecip <= 25) score -= 0.8;
    else if (maxPrecip <= 45) score -= 2.0;
    else if (maxPrecip <= 70) score -= 3.8;
    else score -= 5.5;
  }

  // 3. Vent
  if (maxWind > 15) {
    if (maxWind <= 25) score -= 0.6;
    else if (maxWind <= 35) score -= 1.5;
    else if (maxWind <= 45) score -= 2.8;
    else score -= 4.5;
  }

  // 4. Phénomènes météo particuliers (codes Open-Meteo)
  const isRain = slots.some((x) => [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(x.weatherCode));
  if (isRain && maxPrecip < 40) score -= 1.5;
  const isStorm = slots.some((x) => [95, 96, 99].includes(x.weatherCode));
  if (isStorm) score -= 4.0;
  const isFog = slots.some((x) => x.weatherCode === 45 || x.weatherCode === 48);
  if (isFog) score -= 0.6;

  // Bonus météo parfaite : départ doux (>= 13°C), journée tempérée (<= 27°C), sec et vent calme
  if (maxPrecip === 0 && maxWind <= 15 && tempMin >= 13 && tempMax <= 27 && avgTemp >= 16 && avgTemp <= 25) {
    score = 10.0;
  }

  // Détection des seuils critiques d'annulation
  const isCancellationFort = isStorm || maxPrecip >= 80 || maxWind >= 55;
  const isCancellationEleve =
    !isCancellationFort && (maxPrecip >= 60 || (isRain && maxPrecip >= 45) || maxWind >= 45);

  if (isCancellationFort) {
    score = Math.min(score, 3.5);
  } else if (isCancellationEleve) {
    score = Math.min(score, 5.0);
  }

  score = Math.max(1, Math.min(10, Math.round(score * 10) / 10));

  let label = "Bonnes conditions";
  let badgeColor: "emerald" | "green" | "blue" | "amber" | "orange" | "rose" = "green";

  // Priorité 1 : Risque d'annulation (pluie quasi sûre, orage, vent très très fort)
  if (isCancellationFort) {
    label = "Risque d'annulation : fort";
    badgeColor = "rose";
  } else if (isCancellationEleve) {
    label = "Risque d'annulation : élevé";
    badgeColor = "orange";
  }
  // Priorité 2 : alertes thermiques (trop chaud / canicule ou départ frais/froid)
  else if (tempMax >= 34) {
    label = "Très chaud / Canicule";
    badgeColor = score >= 5.0 ? "orange" : "rose";
  } else if (tempMax >= 30) {
    label = "Chaud";
    badgeColor = "amber";
  } else if (tempMin < 5) {
    label = "Froid au départ";
    badgeColor = "blue";
  } else if (tempMin < 11) {
    label = "Frais au départ";
    badgeColor = score >= 8.0 ? "green" : "blue";
  }
  // Priorité 3 : qualification générale (température agréable entre 11°C et 29°C)
  else if (score >= 9.0 && tempMin >= 13 && tempMax <= 27) {
    label = "Conditions idéales";
    badgeColor = "emerald";
  } else if (score >= 8.0) {
    label = "Très bonnes conditions";
    badgeColor = "green";
  } else if (score >= 6.8) {
    label = "Bonnes conditions";
    badgeColor = "blue";
  } else if (score >= 5.0) {
    label = "Conditions mitigées";
    badgeColor = "amber";
  } else if (score >= 3.5) {
    label = "Conditions délicates";
    badgeColor = "orange";
  } else {
    label = "Sortie rude / défavorable";
    badgeColor = "rose";
  }

  // Phrase de synthèse pour guider le cycliste
  const parts: string[] = [];

  // Alerte prioritaire d'annulation si pluie critique ou vent violent
  if (isStorm) {
    parts.push("Orage prévu · Risque d'annulation fort");
  } else if (maxPrecip >= 80) {
    parts.push(`Pluie quasi certaine (${maxPrecip}%) · Risque d'annulation fort`);
  } else if (maxPrecip >= 60 || (isRain && maxPrecip >= 45)) {
    parts.push(`Pluie probable (${maxPrecip}%) · Risque d'annulation élevé`);
  }

  if (maxWind >= 55) {
    parts.push(`Vent tempétueux (${maxWind} km/h) · Risque d'annulation fort`);
  } else if (maxWind >= 45) {
    parts.push(`Vent très fort (${maxWind} km/h) · Risque d'annulation élevé`);
  }

  if (tempMin < 11 && tempMax >= 15) {
    parts.push(`Fraîcheur au départ (${tempMin}°), douceur à l'arrivée (${tempMax}°)`);
  } else if (tempMin < 5) {
    parts.push(`Froid au départ (${tempMin}°)`);
  } else if (tempMin < 11) {
    parts.push(`Frais au départ (${tempMin}°)`);
  } else if (tempMax >= 34) {
    parts.push(`Très forte chaleur / Canicule (${tempMax}°)`);
  } else if (tempMax >= 30) {
    parts.push(`Forte chaleur (${tempMax}°)`);
  } else if (tempMax <= 27) {
    parts.push(`Température agréable (${tempMin}° à ${tempMax}°)`);
  } else {
    parts.push(`Chaleur modérée (${tempMin}° à ${tempMax}°)`);
  }

  if (maxPrecip === 0) {
    parts.push("zéro pluie");
  } else if (maxPrecip <= 25) {
    parts.push(`faible risque pluie (${maxPrecip}%)`);
  } else if (!parts.some((p) => p.includes("Pluie") || p.includes("Orage"))) {
    parts.push(`risque de pluie (${maxPrecip}%)`);
  }

  if (maxWind <= 12) {
    parts.push("vent très calme");
  } else if (maxWind <= 25) {
    parts.push(`vent modéré (${maxWind} km/h)`);
  } else if (!parts.some((p) => p.includes("Vent"))) {
    parts.push(`vent soutenu (${maxWind} km/h)`);
  }

  const summary = parts.join(" · ");

  return { score, label, summary, badgeColor };
}

const KNOWN_PLACE_COORDS: Record<string, [number, number]> = {
  corum: [43.6139, 3.8824],
  "le corum": [43.6139, 3.8824],
  "esplanade charles-de-gaulle": [43.6111, 3.8812],
  "marché du lez": [43.5985, 3.9015],
  "marche du lez": [43.5985, 3.9015],
  montpellier: [43.6108, 3.8767],
  "saint-gély-du-fesc": [43.6933, 3.8058],
  "saint gely du fesc": [43.6933, 3.8058],
  "castelnau-le-lez": [43.6333, 3.8997],
  "castelnau le lez": [43.6333, 3.8997],
};

async function geocodePlace(place: string): Promise<[number, number] | null> {
  try {
    const query = place.toLowerCase().includes("france") ? place : `${place}, France`;
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query
    )}&count=1&language=fr&format=json`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.results?.[0];
    if (!first) return null;
    return [first.latitude, first.longitude];
  } catch {
    return null;
  }
}

export async function getRideCoordinates(
  routePoints: [number, number][] | null | undefined,
  place: string
): Promise<[number, number] | null> {
  if (routePoints && routePoints.length > 0) return routePoints[0];
  if (place) {
    const normalized = place.trim().toLowerCase();
    if (KNOWN_PLACE_COORDS[normalized]) return KNOWN_PLACE_COORDS[normalized];
    return geocodePlace(place);
  }
  return null;
}

// Open-Meteo ne fournit des prévisions que dans une fenêtre limitée
// (~16 jours). Hors de cette fenêtre, l'API répond en erreur ou sans les
// heures demandées : on renvoie simplement null, le widget est alors omis.
export async function fetchRideWeather(
  lat: number,
  lon: number,
  dateISO: string, // YYYY-MM-DD
  timeStr: string, // HH:MM:SS
  params?: RideWeatherParams
): Promise<RideWeather | null> {
  try {
    const startHour = parseInt(timeStr.slice(0, 2), 10) || 9;
    const durationMinutes = estimateRideDurationMinutes(
      params?.distanceKm,
      params?.elevationGainM,
      params?.groups
    );
    const departureTime = timeStr.slice(0, 5);
    const estimatedArrivalTime = addMinutesToTimeString(timeStr, durationMinutes);
    const durationFormatted = formatDuration(durationMinutes);

    // Heure de fin arrondie au créneau supérieur
    const endMinutes = (parseInt(timeStr.slice(0, 2), 10) || 9) * 60 +
      (parseInt(timeStr.slice(3, 5), 10) || 0) +
      durationMinutes;
    const endHour = Math.min(23, Math.ceil(endMinutes / 60));

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=temperature_2m,precipitation_probability,weathercode,windspeed_10m,winddirection_10m` +
      `&timezone=Europe%2FParis&start_date=${dateISO}&end_date=${dateISO}`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const data = await res.json();
    const times: string[] = data?.hourly?.time || [];

    // Récupérer tous les créneaux horaires entre le départ et l'arrivée
    const hourlySlots: RideWeatherHour[] = [];
    for (let h = startHour; h <= Math.max(startHour, endHour); h++) {
      const target = `${dateISO}T${String(h).padStart(2, "0")}:00`;
      const idx = times.indexOf(target);
      if (idx !== -1) {
        hourlySlots.push({
          time: `${String(h).padStart(2, "0")}:00`,
          hour: h,
          temperatureC: Math.round(data.hourly.temperature_2m[idx]),
          precipitationProbability: Math.round(data.hourly.precipitation_probability[idx]),
          windSpeedKmh: Math.round(data.hourly.windspeed_10m[idx]),
          windDirectionDeg: Math.round(data.hourly.winddirection_10m[idx]),
          weatherCode: data.hourly.weathercode[idx],
        });
      }
    }

    if (hourlySlots.length === 0) return null;

    // Créneau de départ
    const startSlot = hourlySlots[0];

    // Métriques agrégées sur toute la sortie
    const temps = hourlySlots.map((s) => s.temperatureC);
    const precips = hourlySlots.map((s) => s.precipitationProbability);
    const winds = hourlySlots.map((s) => s.windSpeedKmh);

    const tempMin = Math.min(...temps);
    const tempMax = Math.max(...temps);
    const avgTemp = Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10;
    const maxPrecipitationProbability = Math.max(...precips);
    const maxWindSpeedKmh = Math.max(...winds);
    const avgWindSpeedKmh = Math.round(winds.reduce((a, b) => a + b, 0) / winds.length);

    // Ciel dominant : si un phénomène pluvieux/orageux est présent, il prime
    let dominantWeatherCode = startSlot.weatherCode;
    let maxSev = -1;
    for (const s of hourlySlots) {
      const sev = codeSeverity(s.weatherCode);
      if (sev > maxSev) {
        maxSev = sev;
        dominantWeatherCode = s.weatherCode;
      }
    }

    // Calcul de la note de bien-séance sur 10
    const suitability = computeSuitabilityScore(hourlySlots);

    return {
      temperatureC: startSlot.temperatureC,
      precipitationProbability: startSlot.precipitationProbability,
      windSpeedKmh: startSlot.windSpeedKmh,
      windDirectionDeg: startSlot.windDirectionDeg,
      weatherCode: dominantWeatherCode,

      departureTime,
      estimatedArrivalTime,
      durationMinutes,
      durationFormatted,

      tempMin,
      tempMax,
      avgTemp,
      maxPrecipitationProbability,
      maxWindSpeedKmh,
      avgWindSpeedKmh,
      dominantWeatherCode,

      suitabilityScore: suitability.score,
      suitabilityLabel: suitability.label,
      suitabilitySummary: suitability.summary,
      suitabilityBadgeColor: suitability.badgeColor,

      hourlySlots,
    };
  } catch {
    return null;
  }
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];

// windDirectionDeg = direction d'où vient le vent (convention meteo).
export function windDirectionLabel(deg: number): string {
  const idx = Math.round(deg / 45) % 8;
  return COMPASS[idx];
}

export type SkyIcon = "sun" | "cloudSun" | "cloud" | "rain" | "storm" | "snow" | "fog";

export function weatherCodeInfo(code: number): { icon: SkyIcon; label: string; emoji: string } {
  if (code === 0) return { icon: "sun", label: "Ciel dégagé", emoji: "☀️" };
  if (code === 1) return { icon: "sun", label: "Plutôt dégagé", emoji: "🌤️" };
  if (code === 2) return { icon: "cloudSun", label: "Éclaircies", emoji: "🌤️" };
  if (code === 3) return { icon: "cloud", label: "Couvert", emoji: "🌥️" };
  if (code === 45 || code === 48) return { icon: "fog", label: "Brouillard", emoji: "🌥️" };
  if ([51, 53, 55, 56, 57].includes(code)) return { icon: "rain", label: "Bruine", emoji: "🌦️" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: "rain", label: "Pluie", emoji: "🌧️" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: "snow", label: "Neige", emoji: "❄️" };
  if ([95, 96, 99].includes(code)) return { icon: "storm", label: "Orage", emoji: "⛈️" };
  return { icon: "cloud", label: "Nuageux", emoji: "☁️" };
}

/**
 * Retourne l'émoji météo le plus représentatif de la sortie (prend en compte le vent violent).
 */
export function getWeatherEmoji(
  weather?: Pick<RideWeather, "weatherCode" | "dominantWeatherCode" | "maxWindSpeedKmh"> | null
): string {
  if (!weather) return "🌤️";
  const code = weather.dominantWeatherCode ?? weather.weatherCode;
  // Si le vent est très fort (>= 45 km/h) et sans phénomène orageux/pluvieux majeur, la bourrasque prime
  if (
    weather.maxWindSpeedKmh &&
    weather.maxWindSpeedKmh >= 45 &&
    ![95, 96, 99, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)
  ) {
    return "💨";
  }
  return weatherCodeInfo(code).emoji;
}

/**
 * Formate la plage de température d'une sortie pour un affichage compact (ex. "7 → 17°" ou "14°").
 */
export function fmtWeatherTempRange(weather?: RideWeather | null): string | null {
  if (!weather) return null;
  const min = weather.tempMin;
  const max = weather.tempMax;
  if (min !== undefined && max !== undefined) {
    if (min !== max) {
      return `${min}° → ${max}°`;
    }
    return `${min}°`;
  }
  if (weather.temperatureC !== undefined) {
    return `${weather.temperatureC}°`;
  }
  return null;
}
