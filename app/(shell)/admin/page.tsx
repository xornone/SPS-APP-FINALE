import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchAllParticipations, fetchRides } from "@/lib/queries";
import { AdminRidesList } from "@/components/AdminRidesList";
import { LogoutButton } from "@/components/LogoutButton";
import { Icon } from "@/components/Icons";

export default async function AdminPage() {
  const supabase = createClient();
  const [rides, participations] = await Promise.all([fetchRides(supabase), fetchAllParticipations(supabase)]);

  const sorted = [...rides].sort((a, b) => (a.ride_date < b.ride_date ? 1 : -1));
  const counts: Record<string, number> = {};
  participations.forEach((p) => (counts[p.ride_id] = (counts[p.ride_id] || 0) + 1));

  return (
    <div className="relative">
      <div className="px-5 pb-4 pt-5">
        <h1 className="font-display text-[26px] tracking-wide">Administration</h1>
        <p className="text-[12.5px] text-black/45 dark:text-white/45">Créer et gérer les sorties du club.</p>
      </div>

      <AdminRidesList rides={sorted} counts={counts} />

      <LogoutButton />

      <div className="pointer-events-none fixed bottom-24 left-1/2 z-20 w-full max-w-md -translate-x-1/2 px-5">
        <Link
          href="/admin/rides/new"
          className="pointer-events-auto ml-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sps-violet500 to-sps-violet700 text-white shadow-lg"
        >
          <Icon name="plus" size={24} />
        </Link>
      </div>
    </div>
  );
}
