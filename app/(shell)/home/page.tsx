import { Fragment } from "react";
import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/publicClient";
import { fetchAllParticipations, fetchRides } from "@/lib/queries";
import { RideCard } from "@/components/RideCard";
import { WeekDivider } from "@/components/WeekDivider";
import { GroupBadge } from "@/components/GroupBadge";
import { Icon } from "@/components/Icons";
import { AdminOnly } from "@/components/AdminOnly";
import { getRegisteredAdmins } from "@/lib/admins";
import { GROUP_INFO } from "@/lib/types";
import { daysUntil, fmtDateLong, fmtKm, fmtM, fmtTime, fmtWeekLabel, isPastDate, weekKey } from "@/lib/format";

// Page 100% publique (aucune donnee liee a une session, voir
// lib/supabase/publicClient.ts), mais rendue a chaque requete plutot que
// mise en cache : le club prefere voir l'app se mettre a jour a chaque
// clic (changement d'onglet, ouverture d'une sortie, retour arriere)
// plutot que de gagner quelques dixiemes de seconde avec un cache qui peut
// rester perime le temps de sa fenetre de revalidation.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createPublicClient();
  const [rides, participations] = await Promise.all([fetchRides(supabase), fetchAllParticipations(supabase)]);

  // Toutes les sorties du jour le plus proche sont mises en avant (en
  // violet) — pas seulement la premiere — si plusieurs sorties ont lieu le
  // meme jour.
  const upcoming = rides.filter((r) => !isPastDate(r.ride_date));
  const nextDate = upcoming[0]?.ride_date;
  const featured = upcoming.filter((r) => r.ride_date === nextDate);
  const rest = upcoming.filter((r) => r.ride_date !== nextDate).slice(0, 4);

  const countsFor = (rideId: string) => participations.filter((p) => p.ride_id === rideId);
  const adminsFor = (rideId: string) => getRegisteredAdmins(countsFor(rideId));

  return (
    <div>
      <div className="px-5 pb-3 pt-5">
        <h1 className="font-display text-[26px] tracking-wide">Bonjour 👋</h1>
      </div>

      {featured.length > 0 && (
        <>
          <div className="px-5 pb-2">
            <h2 className="font-display text-xl tracking-wide">
              {featured.length > 1 ? "Prochaines sorties" : "Prochaine sortie"}
            </h2>
          </div>
          <div className="mb-6 flex flex-col gap-3 px-5">
            {featured.map((ride) => (
              <Link
                key={ride.id}
                href={`/rides/${ride.id}`}
                className="relative block overflow-hidden rounded-[26px] bg-gradient-to-br from-sps-violet700 to-sps-violet900 p-5 text-[#F4EEFF] shadow-card"
              >
                <span className="text-[11.5px] font-extrabold uppercase tracking-wide text-violet-200">
                  {daysUntil(ride.ride_date) === 0
                    ? "Aujourd'hui"
                    : daysUntil(ride.ride_date) === 1
                      ? "Demain"
                      : fmtDateLong(ride.ride_date)}
                </span>
                <h3 className="mb-1 mt-1.5 font-display text-[27px] leading-tight">{ride.title}</h3>
                <p className="mb-3.5 flex items-center gap-1.5 text-[13px] text-violet-200/90">
                  {fmtTime(ride.ride_time)} · <Icon name="flag" size={13} /> {ride.place}
                </p>
                <div className="mb-4 flex gap-4">
                  <div>
                    <b className="text-sm">{fmtKm(ride.distance_km)}</b>
                    <span className="ml-1 text-[10px] uppercase text-violet-300">distance</span>
                  </div>
                  <div>
                    <b className="text-sm">{fmtM(ride.elevation_gain_m)}</b>
                    <span className="ml-1 text-[10px] uppercase text-violet-300">D+</span>
                  </div>
                  <div>
                    <b className="text-sm">{countsFor(ride.id).length}</b>
                    <span className="ml-1 text-[10px] uppercase text-violet-300">participants</span>
                  </div>
                </div>
                <AdminOnly>
                  <p className="-mt-3 mb-4 text-[11px] font-bold text-violet-200/90">
                    {adminsFor(ride.id).length === 0
                      ? "👑 Aucun admin inscrit"
                      : `👑 ${adminsFor(ride.id)
                          .map((a) => `${a.name} ${GROUP_INFO[a.group].emoji}`)
                          .join(", ")}`}
                  </p>
                </AdminOnly>
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {(ride.ride_groups || []).map((g) => (
                    <GroupBadge key={g.group_level} group={g.group_level} withRange={false} onDark />
                  ))}
                </div>
                <span className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sps-violet500 to-sps-violet700 px-4 py-3 text-sm font-extrabold shadow-lg">
                  Voir la sortie <Icon name="chevR" size={15} />
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="mb-2 flex items-baseline justify-between px-5">
        <h2 className="font-display text-xl tracking-wide">Les prochaines sorties</h2>
        <Link href="/rides" className="text-xs font-bold text-sps-violet600 dark:text-sps-violet400">
          Tout voir
        </Link>
      </div>
      <div className="flex flex-col gap-3 px-5">
        {rest.length === 0 && (
          <p className="rounded-2xl border border-dashed border-black/10 p-6 text-center text-sm text-black/40 dark:border-white/10 dark:text-white/40">
            Aucune autre sortie programmée.
          </p>
        )}
        {rest.map((r, i) => {
          const parts = countsFor(r.id);
          const wKey = weekKey(r.ride_date);
          const isNewWeek = i === 0 || weekKey(rest[i - 1].ride_date) !== wKey;
          return (
            <Fragment key={r.id}>
              {isNewWeek && <WeekDivider label={fmtWeekLabel(r.ride_date)} />}
              <RideCard
                ride={r}
                participantCount={parts.length}
                participantPreview={parts.map((p) => ({ id: p.id, name: p.participant_name }))}
                isJoined={false}
                registeredAdmins={adminsFor(r.id)}
              />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
