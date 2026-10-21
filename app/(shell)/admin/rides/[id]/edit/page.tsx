import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { fetchRide } from "@/lib/queries";
import { RideForm } from "@/components/RideForm";
import { Icon } from "@/components/Icons";
import { getMyStravaConnection } from "@/lib/strava";

export const dynamic = "force-dynamic";

export default async function EditRidePage({ params }: { params: { id: string } }) {
  const reqHeaders = headers();
  const headerUserId = reqHeaders.get("x-user-id");

  const supabase = createClient();
  const userPromise = headerUserId
    ? Promise.resolve({ id: headerUserId })
    : supabase.auth.getUser().then(({ data }) => (data.user ? { id: data.user.id } : null));

  const [ride, stravaConnection] = await Promise.all([
    fetchRide(supabase, params.id),
    headerUserId
      ? getMyStravaConnection(headerUserId)
      : userPromise.then((u) => (u ? getMyStravaConnection(u.id) : null)),
  ]);
  if (!ride) notFound();

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
        <h1 className="truncate font-display text-xl tracking-wide">Modifier la sortie</h1>
      </div>
      <div className="pt-3">
        <RideForm ride={ride} stravaConnection={stravaConnection} />
      </div>
    </div>
  );
}
