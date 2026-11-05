import { createAdminClient } from "./supabase/admin";
import { fetchRideWeather, getRideCoordinates } from "./weather";
import { sendPushToAll } from "./webpush";
import { fmtTime } from "./format";
import type { GroupLevel, Ride } from "./types";

export interface ReminderResult {
  rideId: string;
  rideTitle: string;
  rideDate: string;
  sent: boolean;
  message: string;
}

/**
 * Prépare le message de rappel pour une sortie en intégrant la météo et le lieu.
 */
export async function buildReminderMessage(ride: Ride): Promise<{ title: string; body: string; url: string }> {
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
        weatherSummary = ` · Météo : ${Math.round(weather.temperatureC)}°C${weather.suitabilityLabel ? `, ${weather.suitabilityLabel}` : ""}`;
      }
    }
  } catch {
    // Silencieux si la météo est temporairement inaccessible
  }

  const time = fmtTime(ride.ride_time);
  const place = ride.place || "Point habituel";

  return {
    title: `Rappel SPS : ${ride.title} demain 🚴`,
    body: `Départ ${time} (${place})${weatherSummary} · N'oublie pas ton bidon et ta trace GPX !`,
    url: `/rides/${ride.id}`,
  };
}

/**
 * Envoie le rappel push pour une sortie précise.
 */
export async function sendRideReminder(ride: Ride): Promise<{ success: boolean; payload: { title: string; body: string; url: string } }> {
  const payload = await buildReminderMessage(ride);
  await sendPushToAll(payload);
  return { success: true, payload };
}

/**
 * Trouve les sorties prévues pour une date donnée (par défaut demain) et envoie les rappels.
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
      const { payload } = await sendRideReminder(r);
      results.push({
        rideId: r.id,
        rideTitle: r.title,
        rideDate: r.ride_date,
        sent: true,
        message: payload.body,
      });
    } catch (err: unknown) {
      results.push({
        rideId: r.id,
        rideTitle: r.title,
        rideDate: r.ride_date,
        sent: false,
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
  // Ajoute 24h
  now.setDate(now.getDate() + 1);
  return now.toISOString().slice(0, 10);
}
