"use client";

import { Fragment, useEffect, useState } from "react";
import { V2FeaturedHero } from "./V2FeaturedHero";
import { V2RideCard } from "./V2RideCard";
import { WeekDivider } from "@/components/WeekDivider";
import { QuickJoinModal } from "@/components/QuickJoinModal";
import { fmtWeekLabel, weekKey } from "@/lib/format";
import { getMyRideIds } from "@/lib/myParticipations";
import { getMissingAdminGroups, getRegisteredAdmins } from "@/lib/admins";
import type { GroupLevel, Participation, Ride } from "@/lib/types";
import type { RideWeather } from "@/lib/weather";

export function V2HomeRidesSection({
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
    <div className="space-y-6">
      {/* Featured Hero Rides */}
      {featured.length > 0 && (
        <section className="px-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl tracking-wide text-neutral-900 dark:text-white uppercase">
              {featured.length > 1 ? "Prochaines sorties" : "Prochaine sortie"}
            </h2>
            <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#8B5CF6] dark:text-[#AA26FF]">
              <span className="h-2 w-2 rounded-full bg-[#8B5CF6] dark:bg-[#AA26FF] shadow-[0_0_8px_#AA26FF] animate-pulse" />
              Priorité
            </span>
          </div>

          <div className="flex flex-col gap-4">
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
              />
            ))}
          </div>
        </section>
      )}

      {/* Other Upcoming Rides */}
      <section className="px-5">
        {rest.length > 0 ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl tracking-wide text-neutral-900 dark:text-white uppercase">
                Autres sorties au calendrier
              </h2>
              <span className="rounded-full bg-black/[0.06] text-neutral-700 dark:bg-white/10 dark:text-white/70 px-2.5 py-0.5 text-[11px] font-black">
                {list.length}
              </span>
            </div>

            <div className="flex flex-col gap-3.5">
              {list.length === 0 && (
                <div className="rounded-3xl border border-dashed border-black/10 bg-white/40 p-8 text-center text-sm text-neutral-400 dark:border-white/15 dark:bg-transparent dark:text-white/40">
                  Aucune sortie ne correspond à ce filtre.
                </div>
              )}
              {list.map((r, i) => {
                const parts = countsFor(r.id);
                const wKey = weekKey(r.ride_date);
                const isNewWeek = i === 0 || weekKey(list[i - 1].ride_date) !== wKey;
                return (
                  <Fragment key={r.id}>
                    {isNewWeek && <WeekDivider label={fmtWeekLabel(r.ride_date)} />}
                    <V2RideCard
                      ride={r}
                      participantCount={parts.length}
                      participantPreview={parts.map((p) => ({ id: p.id, name: p.participant_name }))}
                      isJoined={myRideIds.has(r.id)}
                      weather={weatherByRideId?.[r.id]}
                      onQuickAction={(ride) => setSelectedRideForModal(ride)}
                      registeredAdmins={adminsFor(r.id)}
                      missingAdminGroups={missingAdminGroupsFor(r)}
                    />
                  </Fragment>
                );
              })}
            </div>
          </>
        ) : featured.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-sm text-white/40">
            Aucune sortie prévue pour le moment.
          </div>
        ) : null}
      </section>

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
