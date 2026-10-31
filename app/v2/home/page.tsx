import { createPublicClient } from "@/lib/supabase/publicClient";
import { fetchAllParticipations, fetchRides } from "@/lib/queries";
import { V2TopBar } from "@/components/v2/V2TopBar";
import { V2HomeRidesSection } from "@/components/v2/V2HomeRidesSection";
import { NotificationOptIn } from "@/components/NotificationOptIn";
import { isPastDate } from "@/lib/format";
import { fetchRideWeather, getRideCoordinates, type RideWeather } from "@/lib/weather";

export const dynamic = "force-dynamic";

export default async function V2HomePage() {
  const supabase = createPublicClient();
  const [rides, participations] = await Promise.all([
    fetchRides(supabase),
    fetchAllParticipations(supabase),
  ]);

  const upcoming = rides.filter((r) => !isPastDate(r.ride_date));
  const nextDate = upcoming[0]?.ride_date;
  const featured = upcoming.filter((r) => r.ride_date === nextDate);
  const rest = upcoming.filter((r) => r.ride_date !== nextDate);

  // Points GPS pour météo synchronisée
  const upcomingIds = upcoming.map((r) => r.id);
  const { data: upcomingRoutes } = upcomingIds.length > 0
    ? await supabase.from("rides").select("id, route_points").in("id", upcomingIds)
    : { data: [] };
  const routePointsMap = new Map<string, [number, number][]>(
    (upcomingRoutes || []).map((r) => [r.id, r.route_points])
  );

  const weatherEntries = await Promise.all(
    upcoming.map(async (ride) => {
      try {
        const routePoints = routePointsMap.get(ride.id) || ride.route_points;
        const coords = await getRideCoordinates(routePoints, ride.place);
        if (!coords) return [ride.id, null] as const;
        const groups = (ride.ride_groups || []).map((g) => g.group_level);
        const w = await fetchRideWeather(coords[0], coords[1], ride.ride_date, ride.ride_time, {
          distanceKm: ride.distance_km,
          elevationGainM: ride.elevation_gain_m,
          groups,
        });
        return [ride.id, w] as const;
      } catch {
        return [ride.id, null] as const;
      }
    })
  );
  const weatherByRideId: Record<string, RideWeather | null> = Object.fromEntries(weatherEntries);

  return (
    <div className="flex flex-col gap-5">
      <V2TopBar title="Peloton SPS" subtitle="Saison 2026" />
      <NotificationOptIn />
      <V2HomeRidesSection
        featured={featured}
        rest={rest}
        participations={participations}
        weatherByRideId={weatherByRideId}
      />
    </div>
  );
}
