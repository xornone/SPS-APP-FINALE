import Link from "next/link";
import { Suspense } from "react";
import { getStravaConnections, STRAVA_TEST_ADMINS } from "@/lib/stravaTest";
import { StravaConnectPanel } from "@/components/StravaConnectPanel";
import { Icon } from "@/components/Icons";

// Page de test, protegee par le meme middleware que /admin (prefixe
// "/admin"), volontairement non liee depuis la barre de navigation :
// accessible uniquement par son URL directe. La vraie page /admin n'est pas
// modifiee — voir lib/stravaTest.ts pour le detail de l'implementation.
export const dynamic = "force-dynamic";

export default async function Admin2TestPage() {
  const connections = await getStravaConnections();
  const connected = STRAVA_TEST_ADMINS.reduce<Record<string, boolean>>((acc, name) => {
    acc[name] = Boolean(connections[name]);
    return acc;
  }, {});

  return (
    <div className="relative">
      <div className="px-5 pb-4 pt-5">
        <h1 className="font-display text-[26px] tracking-wide">Admin — test Strava</h1>
        <p className="text-[12.5px] text-black/45 dark:text-white/45">
          Page de test (invisible du reste de l’app) : import automatique du tracé GPX depuis un lien Strava.
        </p>
      </div>

      <div className="px-5 pb-4">
        <h2 className="mb-2 font-display text-lg tracking-wide">Comptes Strava connectés</h2>
        <Suspense fallback={null}>
          <StravaConnectPanel admins={STRAVA_TEST_ADMINS as unknown as string[]} connected={connected} />
        </Suspense>
      </div>

      <div className="px-5 pb-24">
        <Link
          href="/admin2test/rides/new"
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sps-violet500 to-sps-violet700 px-4 py-3 text-sm font-semibold text-white"
        >
          <Icon name="plus" size={18} />
          Nouvelle sortie (test import Strava)
        </Link>
      </div>
    </div>
  );
}
