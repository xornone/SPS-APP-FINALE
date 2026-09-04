// Widget meteo pour la fiche sortie : utilise Open-Meteo (API gratuite,
// sans cle) pour recuperer les previsions horaires du jour et de l'heure
// de depart de la sortie. On calcule le point utilise pour la meteo a
// partir du premier point du trace GPX quand il existe, sinon on tente de
// geocoder le lieu de depart texte (best effort : peut echouer sur une
// adresse precise, le widget est alors simplement omis).

export interface RideWeather {
  temperatureC: number;
  precipitationProbability: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  weatherCode: number;
}

async function geocodePlace(place: string): Promise<[number, number] | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      place
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
  routePoints: [number, number][] | null,
  place: string
): Promise<[number, number] | null> {
  if (routePoints && routePoints.length > 0) return routePoints[0];
  if (place) return geocodePlace(place);
  return null;
}

// Open-Meteo ne fournit des previsions que dans une fenetre limitee
// (~16 jours). Hors de cette fenetre, l'API repond en erreur ou sans les
// heures demandees : on renvoie simplement null, le widget est alors omis.
export async function fetchRideWeather(
  lat: number,
  lon: number,
  dateISO: string, // YYYY-MM-DD
  timeStr: string // HH:MM:SS
): Promise<RideWeather | null> {
  try {
    const hour = timeStr.slice(0, 2).padStart(2, "0");
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=temperature_2m,precipitation_probability,weathercode,windspeed_10m,winddirection_10m` +
      `&timezone=Europe%2FParis&start_date=${dateISO}&end_date=${dateISO}`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const data = await res.json();
    const times: string[] = data?.hourly?.time || [];
    const target = `${dateISO}T${hour}:00`;
    const idx = times.indexOf(target);
    if (idx === -1) return null;

    return {
      temperatureC: Math.round(data.hourly.temperature_2m[idx]),
      precipitationProbability: Math.round(data.hourly.precipitation_probability[idx]),
      windSpeedKmh: Math.round(data.hourly.windspeed_10m[idx]),
      windDirectionDeg: Math.round(data.hourly.winddirection_10m[idx]),
      weatherCode: data.hourly.weathercode[idx],
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

export function weatherCodeInfo(code: number): { icon: SkyIcon; label: string } {
  if (code === 0) return { icon: "sun", label: "Ciel dégagé" };
  if (code === 1) return { icon: "sun", label: "Plutôt dégagé" };
  if (code === 2) return { icon: "cloudSun", label: "Éclaircies" };
  if (code === 3) return { icon: "cloud", label: "Couvert" };
  if (code === 45 || code === 48) return { icon: "fog", label: "Brouillard" };
  if ([51, 53, 55, 56, 57].includes(code)) return { icon: "rain", label: "Bruine" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: "rain", label: "Pluie" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: "snow", label: "Neige" };
  if ([95, 96, 99].includes(code)) return { icon: "storm", label: "Orage" };
  return { icon: "cloud", label: "Nuageux" };
}
