import { createClient } from "@/lib/supabase/server";
import { fetchAllParticipations, fetchRides } from "@/lib/queries";
import { RidesFilterList } from "@/components/RidesFilterList";
import { isPastDate } from "@/lib/format";

export default async function RidesPage() {
  const supabase = createClient();
  const [rides, participations] = await Promise.all([fetchRides(supabase), fetchAllParticipations(supabase)]);
  const upcoming = rides.filter((r) => !isPastDate(r.ride_date));

  return (
    <div>
      <div className="px-5 pb-3 pt-5">
        <h1 className="font-display text-[26px] tracking-wide">Sorties</h1>
      </div>
      <RidesFilterList rides={upcoming} participations={participations} />
    </div>
  );
}
