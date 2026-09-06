import { createPublicClient } from "@/lib/supabase/publicClient";
import { fetchAllParticipations, fetchRides } from "@/lib/queries";
import { RidesFilterList } from "@/components/RidesFilterList";
import { isPastDate } from "@/lib/format";

// Page 100% publique (aucune donnee liee a une session, voir
// lib/supabase/publicClient.ts), mais rendue a chaque requete plutot que
// mise en cache : voir la meme note sur app/(shell)/home/page.tsx.
export const dynamic = "force-dynamic";

export default async function RidesPage() {
  const supabase = createPublicClient();
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
