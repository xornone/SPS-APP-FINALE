import { createPublicClient } from "@/lib/supabase/publicClient";
import { fetchRides } from "@/lib/queries";
import { GpxList, type GpxEntry } from "@/components/GpxList";
import type { Ride } from "@/lib/types";

// Page 100% publique (aucune donnee liee a une session, meme client que
// app/(shell)/home/page.tsx), rendue a chaque requete plutot que mise en
// cache pour la meme raison (une trace GPX ajoutee/retiree doit apparaitre
// tout de suite).
export const dynamic = "force-dynamic";

function withGpxUrl(ride: Ride, supabase: ReturnType<typeof createPublicClient>) {
  return {
    ride,
    gpxUrl: ride.gpx_path ? supabase.storage.from("gpx").getPublicUrl(ride.gpx_path).data.publicUrl : null,
  };
}

export default async function GpxPage() {
  const supabase = createPublicClient();
  const rides = await fetchRides(supabase);

  // Seules les sorties avec une trace GPX effectivement deposee ont leur
  // place ici : le but de cet onglet est un catalogue de telechargements,
  // pas une liste de toutes les sorties (voir Accueil pour ca). Plus de
  // distinction a venir / passees : une seule liste, triee par distance
  // dans GpxList.
  const withGpx = rides.map((ride) => withGpxUrl(ride, supabase)).filter((r): r is { ride: Ride; gpxUrl: string } => !!r.gpxUrl);

  const entries: GpxEntry[] = withGpx.map(({ ride, gpxUrl }) => ({
    id: ride.id,
    title: ride.title,
    rideDate: ride.ride_date,
    rideTime: ride.ride_time,
    place: ride.place,
    placeUrl: ride.place_url,
    distanceKm: ride.distance_km,
    elevationGainM: ride.elevation_gain_m,
    groups: (ride.ride_groups || []).map((g) => g.group_level),
    gpxUrl,
  }));

  return (
    <div>
      <div className="px-5 pb-3 pt-5">
        <h1 className="font-display text-[26px] tracking-wide">Traces GPX</h1>
        <p className="text-[12.5px] text-black/45 dark:text-white/45">
          {withGpx.length} trace{withGpx.length > 1 ? "s" : ""} disponible{withGpx.length > 1 ? "s" : ""} au telechargement.
        </p>
      </div>

      {withGpx.length === 0 ? (
        <div className="mx-5 rounded-2xl border border-dashed border-black/10 px-4 py-8 text-center text-[13px] text-black/40 dark:border-white/15 dark:text-white/40">
          Aucune trace GPX disponible pour le moment.
        </div>
      ) : (
        <GpxList entries={entries} />
      )}
    </div>
  );
}
