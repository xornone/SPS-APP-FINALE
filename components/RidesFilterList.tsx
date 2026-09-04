"use client";

import { Fragment, useEffect, useState } from "react";
import { RideCard } from "./RideCard";
import { WeekDivider } from "./WeekDivider";
import { fmtWeekLabel, isCurrentWeek, isWeekend, weekKey } from "@/lib/format";
import { getMyRideIds } from "@/lib/myParticipations";
import type { Participation, Ride } from "@/lib/types";

type Filter = "toutes" | "semaine" | "weekend" | "mine";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "toutes", label: "Toutes" },
  { key: "semaine", label: "Cette semaine" },
  { key: "weekend", label: "Ce week-end" },
  { key: "mine", label: "Mes sorties" },
];

export function RidesFilterList({
  rides,
  participations,
}: {
  rides: Ride[];
  participations: Participation[];
}) {
  const [filter, setFilter] = useState<Filter>("toutes");
  const [myRideIds, setMyRideIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMyRideIds(getMyRideIds());
  }, []);

  const countsFor = (rideId: string) => participations.filter((p) => p.ride_id === rideId);

  // "Cette semaine" / "Ce week-end" se basent sur la semaine calendaire en
  // cours (lundi -> dimanche), pas sur une fenetre glissante de 7 jours qui
  // deborderait sur la semaine suivante.
  let list = rides;
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
              />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
