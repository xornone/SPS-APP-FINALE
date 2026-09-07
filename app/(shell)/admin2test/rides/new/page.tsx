import Link from "next/link";
import { RideFormStravaTest } from "@/components/RideFormStravaTest";
import { Icon } from "@/components/Icons";
import { getStravaConnections, STRAVA_TEST_ADMINS } from "@/lib/stravaTest";

export const dynamic = "force-dynamic";

export default async function NewRideStravaTestPage() {
  const connections = await getStravaConnections();
  const connectedAdmins = STRAVA_TEST_ADMINS.filter((name) => connections[name]);

  return (
    <div>
      <div className="flex items-center gap-3 px-5 pb-2 pt-5">
        <Link
          href="/admin2test"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-black/[0.08] bg-white dark:border-white/10 dark:bg-[#1A1422]"
        >
          <Icon name="chevL" size={18} />
        </Link>
        <h1 className="font-display text-xl tracking-wide">Nouvelle sortie (test Strava)</h1>
      </div>
      <div className="pt-3">
        <RideFormStravaTest connectedAdmins={connectedAdmins as unknown as string[]} />
      </div>
    </div>
  );
}
