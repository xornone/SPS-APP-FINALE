import { createAdminClient } from "./supabase/admin";
import { fetchRideWeather, getRideCoordinates, type RideWeather } from "./weather";
import { sendPushToAll, type PushPayload } from "./webpush";
import { fmtTime } from "./format";
import type { GroupLevel, Ride } from "./types";

export interface ReminderResult {
  rideId: string;
  rideTitle: string;
  rideDate: string;
  sent: boolean;
  participantCount: number;
  message: string;
}

/**
 * Formate la météo pour le rappel push selon les souhaits :
 * température + état réel du ciel / pluie (% de risque).
 * Pas de terme vague "conditions mitigées" ou "annulation".
 */
export function formatReminderWeather(weather: RideWeather): string {
  const code = weather.dominantWeatherCode ?? weather.weatherCode;
  const rainRisk = Math.round(weather.maxPrecipitationProbability ?? weather.precipitationProbability ?? 0);

  let label = "Nuageux";
  let emoji = "☁️";

  if (code === 0) {
    label = "Ciel dégagé";
    emoji = "☀️";
  } else if (code === 1) {
    label = "Ensoleillé";
    emoji = "☀️";
  } else if (code === 2) {
    label = "Éclaircies";
    emoji = "🌤️";
  } else if (code === 3) {
    label = "Ciel couvert";
    emoji = "🌥️";
  } else if (code === 45 || code === 48) {
    label = "Brouillard";
    emoji = "🌫️";
  } else if ([51, 53, 55, 56, 57].includes(code)) {
    label = "Bruine";
    emoji = "🌦️";
  } else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    label = "Pluie";
    emoji = "🌧️";
  } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
    label = "Neige";
    emoji = "❄️";
  } else if ([95, 96, 99].includes(code)) {
    label = "Orage";
    emoji = "⛈️";
  }

  const isRainCode = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code);
  let conditionText = `${emoji} ${label}`;
  if (isRainCode && rainRisk > 0) {
    conditionText = `${emoji} ${label} (${rainRisk}% de risque)`;
  } else if (!isRainCode && rainRisk >= 25) {
    conditionText = `${emoji} ${label} (${rainRisk}% de risque de pluie)`;
  }

  const temp = Math.round(weather.temperatureC);
  return `${temp}°C, ${conditionText}`;
}

/**
 * Prépare le message de rappel pour une sortie :
 * "Départ HH:MM (Lieu) · Température, Condition météo"
 * Sans phrase accessoire ("N'oublie pas ton bidon...").
 */
export async function buildReminderMessage(ride: Ride): Promise<PushPayload> {
  const groups: GroupLevel[] = (ride.ride_groups || []).map((g) => g.group_level);
  let coords: [number, number] | null = null;
  try {
    coords = await getRideCoordinates(ride.route_points, ride.place);
  } catch {
    coords = null;
  }

  let weatherSummary = "";
  try {
    if (coords) {
      const [lat, lon] = coords;
      const weather = await fetchRideWeather(
        lat,
        lon,
        ride.ride_date,
        ride.ride_time,
        {
          distanceKm: ride.distance_km,
          elevationGainM: ride.elevation_gain_m,
          groups,
        }
      );

      if (weather) {
        weatherSummary = ` · ${formatReminderWeather(weather)}`;
      }
    }
  } catch {
    // Silencieux si la météo est temporairement indisponible
  }

  const time = fmtTime(ride.ride_time);
  const place = ride.place || "Point habituel";

  return {
    title: `Rappel SPS : ${ride.title} demain 🚴`,
    body: `Départ ${time} (${place})${weatherSummary}`,
    url: `/rides/${ride.id}`,
    type: "ride_reminder",
    rideId: ride.id,
  };
}

/**
 * Envoie le rappel push pour une sortie précise, ciblé uniquement sur les inscrits de la sortie.
 */
export async function sendRideReminder(ride: Ride): Promise<{
  success: boolean;
  participantCount: number;
  payload: PushPayload;
}> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("participations")
    .select("*", { count: "exact", head: true })
    .eq("ride_id", ride.id);

  const participantCount = count ?? 0;
  const payload = await buildReminderMessage(ride);

  // Si aucun inscrit sur la sortie, pas d'envoi inutile
  if (participantCount > 0) {
    await sendPushToAll(payload);
  }

  return { success: true, participantCount, payload };
}

/**
 * Trouve les sorties prévues pour une date donnée (par défaut demain) et envoie les rappels aux inscrits.
 */
export async function sendTomorrowRidesReminders(targetDate?: string): Promise<ReminderResult[]> {
  const dateStr = targetDate || getTomorrowDateString();

  const supabase = createAdminClient();
  const { data: rides, error } = await supabase
    .from("rides")
    .select("*, ride_groups(*)")
    .eq("ride_date", dateStr);

  if (error || !rides || rides.length === 0) {
    return [];
  }

  const results: ReminderResult[] = [];
  for (const r of rides as Ride[]) {
    try {
      const { participantCount, payload } = await sendRideReminder(r);
      results.push({
        rideId: r.id,
        rideTitle: r.title,
        rideDate: r.ride_date,
        sent: participantCount > 0,
        participantCount,
        message: participantCount > 0 ? payload.body : "Aucun inscrit sur la sortie",
      });
    } catch (err: unknown) {
      results.push({
        rideId: r.id,
        rideTitle: r.title,
        rideDate: r.ride_date,
        sent: false,
        participantCount: 0,
        message: err instanceof Error ? err.message : "Erreur envoi push",
      });
    }
  }

  return results;
}

/**
 * Date au format YYYY-MM-DD pour demain (heure de Paris).
 */
export function getTomorrowDateString(): string {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  return now.toISOString().slice(0, 10);
}
