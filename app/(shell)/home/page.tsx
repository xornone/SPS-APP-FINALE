import { createPublicClient } from "@/lib/supabase/publicClient";
import { fetchAllParticipations, fetchRides } from "@/lib/queries";
import { getActivePollForHome } from "@/lib/pollsStorage";
import { checkIsAdminServer } from "@/lib/adminGuard";
import { HomeRidesSection } from "@/components/HomeRidesSection";
import { NotificationOptIn } from "@/components/NotificationOptIn";
import { JerseyPreorderBanner } from "@/components/JerseyPreorderBanner";
import { PreorderVisibility } from "@/components/PreorderVisibility";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SuggestionButton } from "@/components/SuggestionButton";
import { ActivePollBanner } from "@/components/ActivePollBanner";
import { isPastDate } from "@/lib/format";
import { fetchRideWeather, getRideCoordinates, type RideWeather } from "@/lib/weather";

// Page rendue à chaque requête (force-dynamic) pour garantir des données fraîches.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createPublicClient();
  const [rides, participations, activePoll, isAdmin] = await Promise.all([
    fetchRides(supabase),
    fetchAllParticipations(supabase),
    getActivePollForHome(),
    checkIsAdminServer(),
  ]);

  // Toutes les sorties du jour le plus proche sont mises en avant (en
  // violet) — pas seulement la premiere — si plusieurs sorties ont lieu le
  // meme jour.
  const upcoming = rides.filter((r) => !isPastDate(r.ride_date));
  const nextDate = upcoming[0]?.ride_date;
  const featured = upcoming.filter((r) => r.ride_date === nextDate);
  // Le reste des sorties a venir (Accueil et Sorties etaient deux onglets
  // distincts qui affichaient en partie les memes sorties ; desormais un
  // seul onglet, avec la liste complete — plus de plafond a 4 — et les
  // filtres qu'avait l'onglet Sorties, places en haut de page par
  // HomeRidesSection).
  const rest = upcoming.filter((r) => r.ride_date !== nextDate);

  // Récupère les coordonnées de départ de manière optimale :
  // utilise les lieux connus en cache immédiat et n'interroge les points GPS
  // que pour les sorties dont le lieu n'est pas répertorié (évite de transférer
  // de gros volumes de coordonnées GPS inutilement).
  const ridesNeedingCoords = upcoming.filter((r) => {
    const norm = (r.place || "").trim().toLowerCase();
    return norm !== "corum" && norm !== "le corum" && norm !== "marché du lez" && norm !== "marche du lez" && norm !== "montpellier";
  });

  const idsToFetch = ridesNeedingCoords.map((r) => r.id);
  const { data: upcomingRoutes } = idsToFetch.length > 0
    ? await supabase.from("rides").select("id, route_points").in("id", idsToFetch)
    : { data: [] };
  const routePointsMap = new Map<string, [number, number][]>(
    (upcomingRoutes || []).map((r) => [r.id, r.route_points])
  );

  // Pré-charge la météo en parallèle avec un délai limite de sécurité (1.5s max)
  // pour garantir un affichage ultra-fluide sans bloquer le rendu si l'API météo externe ralentit.
  const weatherEntries = await Promise.all(
    upcoming.map(async (ride) => {
      try {
        const routePoints = routePointsMap.get(ride.id) || ride.route_points;
        const coords = await getRideCoordinates(routePoints, ride.place);
        if (!coords) return [ride.id, null] as const;
        const groups = (ride.ride_groups || []).map((g) => g.group_level);

        const weatherPromise = fetchRideWeather(coords[0], coords[1], ride.ride_date, ride.ride_time, {
          distanceKm: ride.distance_km,
          elevationGainM: ride.elevation_gain_m,
          groups,
        });

        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 1500)
        );

        const w = await Promise.race([weatherPromise, timeoutPromise]);
        return [ride.id, w] as const;
      } catch {
        return [ride.id, null] as const;
      }
    })
  );
  const weatherByRideId: Record<string, RideWeather | null> = Object.fromEntries(weatherEntries);

  return (
    <div>
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <h1 className="font-display text-[26px] tracking-wide">Bonjour 👋</h1>
        <div className="flex items-center gap-2 flex-shrink-0">
          <SuggestionButton />
          <ThemeToggle />
        </div>
      </div>
      <PreorderVisibility>
        <JerseyPreorderBanner />
      </PreorderVisibility>
      <ActivePollBanner initialPoll={activePoll} initialIsAdmin={isAdmin} />
      <NotificationOptIn />
      <HomeRidesSection
        featured={featured}
        rest={rest}
        participations={participations}
        weatherByRideId={weatherByRideId}
      />
    </div>
  );
}
