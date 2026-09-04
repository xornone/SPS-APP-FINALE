import { createClient } from "@/lib/supabase/server";
import { fetchRides } from "@/lib/queries";
import { MapExplorer } from "@/components/MapExplorer";
import { isPastDate } from "@/lib/format";

export default async function MapPage() {
  const supabase = createClient();
  const rides = (await fetchRides(supabase)).filter((r) => !isPastDate(r.ride_date));

  const gpxUrls: Record<string, string | null> = {};
  for (const r of rides) {
    gpxUrls[r.id] = r.gpx_path ? supabase.storage.from("gpx").getPublicUrl(r.gpx_path).data.publicUrl : null;
  }

  return (
    <div>
      <div className="px-5 pb-3 pt-5">
        <h1 className="font-display text-[26px] tracking-wide">Carte</h1>
      </div>
      <MapExplorer rides={rides} gpxUrls={gpxUrls} />
    </div>
  );
}
