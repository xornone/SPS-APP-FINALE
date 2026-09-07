"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { RideCard } from "./RideCard";
import { WeekDivider } from "./WeekDivider";
import { GroupBadge } from "./GroupBadge";
import { AdminBadge } from "./AdminBadge";
import { AdminOnly } from "./AdminOnly";
import { Icon } from "./Icons";
import {
  daysUntil,
  fmtDateLong,
  fmtKm,
  fmtM,
  fmtTime,
  fmtWeekLabel,
  isCurrentWeek,
  isWeekend,
  weekKey,
} from "@/lib/format";
import { getMyRideIds } from "@/lib/myParticipations";
import { getMissingAdminGroups, getRegisteredAdmins } from "@/lib/admins";
import { GROUP_INFO, type Participation, type Ride } from "@/lib/types";

type Filter = "toutes" | "semaine" | "weekend" | "mine";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "toutes", label: "Toutes" },
  { key: "semaine", label: "Cette semaine" },
  { key: "weekend", label: "Ce week-end" },
  { key: "mine", label: "Mes sorties" },
];

// Regroupe tout le contenu "sorties" de l'Accueil (ex-onglets Accueil +
// Sorties, fusionnes) dans un seul composant client : les filtres doivent
// rester en haut de la page, au-dessus meme de la sortie mise en avant,
// alors que la sortie mise en avant elle n'est jamais filtree (elle
// affiche toujours la prochaine date) — un seul composant qui possede
// l'etat de filtre permet de placer les deux blocs dans cet ordre tout en
// gardant la liste du bas synchronisee avec le filtre choisi.
export function HomeRidesSection({
  featured,
  rest,
  participations,
}: {
  featured: Ride[];
  rest: Ride[];
  participations: Participation[];
}) {
  const [filter, setFilter] = useState<Filter>("toutes");
  const [myRideIds, setMyRideIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMyRideIds(getMyRideIds());
  }, []);

  const countsFor = (rideId: string) => participations.filter((p) => p.ride_id === rideId);
  const adminsFor = (rideId: string) => getRegisteredAdmins(countsFor(rideId));
  const missingAdminGroupsFor = (ride: Ride) =>
    getMissingAdminGroups((ride.ride_groups || []).map((g) => g.group_level), adminsFor(ride.id));

  // "Cette semaine" / "Ce week-end" se basent sur la semaine calendaire en
  // cours (lundi -> dimanche), pas sur une fenetre glissante de 7 jours qui
  // deborderait sur la semaine suivante.
  let list = rest;
  if (filter === "semaine") list = list.filter((r) => isCurrentWeek(r.ride_date));
  else if (filter === "weekend") list = list.filter((r) => isCurrentWeek(r.ride_date) && isWeekend(r.ride_date));
  else if (filter === "mine") list = list.filter((r) => myRideIds.has(r.id));

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto px-5 pb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-none rounded-full border px-3.5 py-2 text-[12.5px] font-bold ${
              filter === f.key
                ? "border-sps-violet600 bg-sps-violet600 text-white"
                : "border-black/10 bg-white text-black/55 dark:border-white/15 dark:bg-[#1A1422] dark:text-white/55"
            }`}
          >
            {f.label}
          </button>
        ))}
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
                  <div className="-mt-3 mb-4 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-violet-200/90">
                      👑 {adminsFor(ride.id).length}
                    </span>
                    {adminsFor(ride.id).map((a) => (
                      <AdminBadge key={a.name} name={a.name} group={a.group} />
                    ))}
                  </div>
                  {missingAdminGroupsFor(ride).length > 0 && (
                    <p className="-mt-3 mb-4 text-[11px] font-bold text-amber-300">
                      ⚠️ Pas d&apos;admin en {missingAdminGroupsFor(ride).map((g) => GROUP_INFO[g].label).join(", ")}
                    </p>
                  )}
                </AdminOnly>
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {(ride.ride_groups || []).map((g) => (
                    <GroupBadge key={g.group_level} group={g.group_level} withRange={false} />
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

      <div className="mb-2 px-5">
        <h2 className="font-display text-xl tracking-wide">Les prochaines sorties</h2>
      </div>
      <div className="flex flex-col gap-3 px-5">
        {list.length === 0 && (
          <p className="rounded-2xl border border-dashed border-black/10 p-8 text-center text-sm text-black/40 dark:border-white/10 dark:text-white/40">
            Aucune sortie ne correspond à ce filtre.
          </p>
        )}
        {list.map((r, i) => {
          const parts = countsFor(r.id);
          const wKey = weekKey(r.ride_date);
          const isNewWeek = i === 0 || weekKey(list[i - 1].ride_date) !== wKey;
          return (
            <Fragment key={r.id}>
              {isNewWeek && <WeekDivider label={fmtWeekLabel(r.ride_date)} />}
              <RideCard
                ride={r}
                participantCount={parts.length}
                participantPreview={parts.map((p) => ({ id: p.id, name: p.participant_name }))}
                isJoined={myRideIds.has(r.id)}
                registeredAdmins={adminsFor(r.id)}
              />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
