import Link from "next/link";
import { headers } from "next/headers";
import { RideForm } from "@/components/RideForm";
import { Icon } from "@/components/Icons";
import { createClient } from "@/lib/supabase/server";
import { getMyStravaConnection } from "@/lib/strava";

export const dynamic = "force-dynamic";

export default async function NewRidePage() {
  const reqHeaders = headers();
  const headerUserId = reqHeaders.get("x-user-id");

  const userId =
    headerUserId ||
    (await createClient()
      .auth.getUser()
      .then(({ data }) => data.user?.id || null));

  const stravaConnection = userId ? await getMyStravaConnection(userId) : null;

  return (
    <div>
      <div className="flex items-center gap-3 px-5 pb-2 pt-5">
        <Link
          href="/admin"
          prefetch={true}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-black/[0.08] bg-white dark:border-white/10 dark:bg-[#1A1422]"
        >
          <Icon name="chevL" size={18} />
        </Link>
        <h1 className="font-display text-xl tracking-wide">Nouvelle sortie</h1>
      </div>
      <div className="pt-3">
        <RideForm stravaConnection={stravaConnection} />
      </div>
    </div>
  );
}
