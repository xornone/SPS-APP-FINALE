"use client";

import { Fragment, useEffect, useState } from "react";
import { V2FeaturedHero } from "./v2/V2FeaturedHero";
import { V2RideCard } from "./v2/V2RideCard";
import { WeekDivider } from "./WeekDivider";
import { QuickJoinModal } from "./QuickJoinModal";
import {
  fmtWeekLabel,
  weekKey,
} from "@/lib/format";
import { getMyRideIds } from "@/lib/myParticipations";
import { getMissingAdminGroups, getRegisteredAdmins } from "@/lib/admins";
import type { GroupLevel, Participation, Ride } from "@/lib/types";
import type { RideWeather } from "@/lib/weather";

export function HomeRidesSection({
  featured,
  rest,
  participations,
  weatherByRideId,
}: {
  featured: Ride[];
  rest: Ride[];
  participations: Participation[];
  weatherByRideId?: Record<string, RideWeather | null>;
}) {
  const [myRideIds, setMyRideIds] = useState<Set<string>>(new Set());
  const [currentParticipations, setCurrentParticipations] = useState<Participation[]>(participations);
  const [selectedRideForModal, setSelectedRideForModal] = useState<Ride | null>(null);

  useEffect(() => {
    setMyRideIds(getMyRideIds());
  }, []);

  useEffect(() => {
    setCurrentParticipations(participations);
  }, [participations]);

  function handleJoinSuccess(newP: Participation) {
    setCurrentParticipations((prev) => {
      if (prev.some((p) => p.id === newP.id)) return prev;
      return [...prev, newP];
    });
    setMyRideIds(getMyRideIds());
  }

  function handleLeaveSuccess(participationId: string) {
    setCurrentParticipations((prev) => prev.filter((p) => p.id !== participationId));
    setMyRideIds(getMyRideIds());
  }

  function handleChangeGroupSuccess(participationId: string, newGroup: GroupLevel) {
    setCurrentParticipations((prev) =>
      prev.map((p) => (p.id === participationId ? { ...p, group_level: newGroup } : p))
    );
  }

  const countsFor = (rideId: string) => currentParticipations.filter((p) => p.ride_id === rideId);
  const adminsFor = (rideId: string) => getRegisteredAdmins(countsFor(rideId));
  const missingAdminGroupsFor = (ride: Ride) =>
    getMissingAdminGroups((ride.ride_groups || []).map((g) => g.group_level), adminsFor(ride.id));

  const list = rest;

  return (
    <div>
      {featured.length > 0 && (
        <>
          <div className="px-5 pb-2">
            <h2 className="font-display text-xl tracking-wide">
              {featured.length > 1 ? "Prochaines sorties" : "Prochaine sortie"}
            </h2>
          </div>
          <div className="mb-6 flex flex-col gap-3 px-5">
            {featured.map((ride) => (
              <V2FeaturedHero
                key={ride.id}
                ride={ride}
                participantCount={countsFor(ride.id).length}
                isJoined={myRideIds.has(ride.id)}
                weather={weatherByRideId?.[ride.id]}
                onQuickAction={(r) => setSelectedRideForModal(r)}
                registeredAdmins={adminsFor(ride.id)}
                missingAdminGroups={missingAdminGroupsFor(ride)}
                hrefPrefix="/rides"
              />
            ))}
          </div>
        </>
      )}

      {rest.length > 0 ? (
        <>
          <div className="mb-2 px-5">
            <h2 className="font-display text-xl tracking-wide">Autres sorties à venir</h2>
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
                  <V2RideCard
                    key={r.id}
                    ride={r}
                    participantCount={parts.length}
                    participantPreview={parts.map((p) => ({ id: p.id, name: p.participant_name }))}
                    isJoined={myRideIds.has(r.id)}
                    weather={weatherByRideId?.[r.id]}
                    onQuickAction={(ride) => setSelectedRideForModal(ride)}
                    registeredAdmins={adminsFor(r.id)}
                    missingAdminGroups={missingAdminGroupsFor(r)}
                    hrefPrefix="/rides"
                  />
                </Fragment>
              );
            })}
          </div>
        </>
      ) : featured.length === 0 ? (
        <div className="flex flex-col gap-3 px-5">
          <p className="rounded-2xl border border-dashed border-black/10 p-8 text-center text-sm text-black/40 dark:border-white/10 dark:text-white/40">
            Aucune sortie prévue pour le moment.
          </p>
        </div>
      ) : null}

      <QuickJoinModal
        ride={selectedRideForModal}
        isOpen={Boolean(selectedRideForModal)}
        onClose={() => setSelectedRideForModal(null)}
        onJoinSuccess={handleJoinSuccess}
        onLeaveSuccess={handleLeaveSuccess}
        onChangeGroupSuccess={handleChangeGroupSuccess}
      />
    </div>
  );
}
