import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/publicClient";
import { fetchRides } from "@/lib/queries";
import { Icon } from "@/components/Icons";
import { GroupBadge } from "@/components/GroupBadge";
import { PlaceLink } from "@/components/PlaceLink";
import { GpxDistanceFilter } from "@/components/GpxDistanceFilter";
import { fmtDateShort, fmtKm, fmtM, fmtTime, isPastDate } from "@/lib/format";
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
  try {
    return await renderGpxPage();
  } catch (err) {
    // DEBUG TEMPORAIRE — a retirer une fois la cause de l'erreur 500 identifiee.
    const e = err as Error;
    return (
      <pre className="mx-5 mt-5 overflow-auto whitespace-pre-wrap rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-[11px] text-red-700">
        {String(e?.message || e)}
        {"\n\n"}
        {String(e?.stack || "")}
      </pre>
    );
  }
}

async function renderGpxPage() {
  const supabase = createPublicClient();
  const rides = await fetchRides(supabase);

  // Seules les sorties avec une trace GPX effectivement deposee ont leur
  // place ici : le but de cet onglet est un catalogue de telechargements,
  // pas une liste de toutes les sorties (voir Accueil pour ca).
  const withGpx = rides.map((ride) => withGpxUrl(ride, supabase)).filter((r): r is { ride: Ride; gpxUrl: string } => !!r.gpxUrl);

  const upcoming = withGpx.filter((r) => !isPastDate(r.ride.ride_date));
  const past = withGpx
    .filter((r) => isPastDate(r.ride.ride_date))
    .sort((a, b) => b.ride.ride_date.localeCompare(a.ride.ride_date));

  // Forme allegee pour le filtre client (voir le commentaire dans
  // GpxDistanceFilter.tsx) : on evite de faire traverser route_points (la
  // trace GPS parsee, potentiellement volumineuse) au navigateur pour
  // chaque sortie, alors que seuls id/distance/D+/lien GPX sont utiles ici.
  const filterEntries = withGpx.map(({ ride, gpxUrl }) => ({
    id: ride.id,
    distanceKm: ride.distance_km,
    elevationGainM: ride.elevation_gain_m,
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
        <>
          <GpxDistanceFilter entries={filterEntries} />

          <div className="flex flex-col gap-6 px-5">
          {upcoming.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <h2 className="text-[11px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40">
                A venir
              </h2>
              {upcoming.map(({ ride, gpxUrl }) => (
                <GpxRow key={ride.id} ride={ride} gpxUrl={gpxUrl} />
              ))}
            </section>
          )}

          {past.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <h2 className="text-[11px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40">
                Sorties passees
              </h2>
              {past.map(({ ride, gpxUrl }) => (
                <GpxRow key={ride.id} ride={ride} gpxUrl={gpxUrl} />
              ))}
            </section>
          )}
          </div>
        </>
      )}
    </div>
  );
}

function GpxRow({ ride, gpxUrl }: { ride: Ride; gpxUrl: string }) {
  // DEBUG TEMPORAIRE — force une evaluation synchrone (et donc interceptable
  // par ce try/catch) de tout ce qui, en JSX normal, serait evalue plus
  // tard par React lors du rendu des enfants (donc hors de portee d'un
  // try/catch place dans le composant parent). A retirer une fois la cause
  // de l'erreur 500 identifiee.
  //
  // IMPORTANT : PlaceLink est un composant client ("use client") — dans un
  // composant serveur, son import n'est pas la fonction elle-meme mais une
  // reference client speciale, qui ne peut etre utilisee qu'en JSX
  // (<PlaceLink .../>), jamais appelee directement comme une fonction JS
  // (PlaceLink(...) leve "... is not a function"). On le laisse donc en
  // JSX normal ; seul GroupBadge (un composant serveur ordinaire) peut etre
  // appele directement pour etre couvert par ce try/catch.
  try {
    const dateLabel = fmtDateShort(ride.ride_date);
    const timeLabel = fmtTime(ride.ride_time);
    const kmLabel = fmtKm(ride.distance_km);
    const mLabel = fmtM(ride.elevation_gain_m);
    const badges = (ride.ride_groups || []).map((g) => (
      <span key={g.group_level}>{GroupBadge({ group: g.group_level, withRange: false })}</span>
    ));

    return (
      <div className="flex items-center gap-3 rounded-[20px] border border-black/[0.06] bg-white p-4 shadow-cardSm dark:border-white/10 dark:bg-[#1A1422]">
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-sps-violet600/10 text-sps-violet600 dark:text-sps-violet400">
          <Icon name="gpx" size={20} />
        </div>
        <Link href={`/rides/${ride.id}`} className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-extrabold leading-tight">{ride.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-black/50 dark:text-white/50">
            <span>
              {dateLabel} · {timeLabel}
            </span>
            <span className="flex items-center gap-1">
              {/* DEBUG TEMPORAIRE : PlaceLink remplace par du texte brut pour isoler si le crash vient de lui */}
              <Icon name="flag" size={11} /> {ride.place}
            </span>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-black/45 dark:text-white/45">
            <span>
              <b className="text-black/70 dark:text-white/70">{kmLabel}</b> · <b className="text-black/70 dark:text-white/70">{mLabel}</b> D+
            </span>
            <span className="flex gap-1">{badges}</span>
          </p>
        </Link>
        <a
          href={gpxUrl}
          download
          onClick={(e) => e.stopPropagation()}
          className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-black/[0.08] bg-white dark:border-white/10 dark:bg-[#1A1422]"
          aria-label={`Telecharger le GPX de ${ride.title}`}
        >
          <Icon name="download" size={17} />
        </a>
      </div>
    );
  } catch (err) {
    const e = err as Error;
    return (
      <pre className="overflow-auto whitespace-pre-wrap rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-[11px] text-red-700">
        {`ride ${ride.id} (${ride.title}): ${String(e?.message || e)}`}
      </pre>
    );
  }
}
