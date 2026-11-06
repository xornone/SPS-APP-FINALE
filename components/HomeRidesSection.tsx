"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { FeaturedHero } from "./FeaturedHero";
import { RideCard } from "./RideCard";
import { WeekDivider } from "./WeekDivider";
import { QuickJoinModal } from "./QuickJoinModal";
import {
  fmtWeekLabel,
  weekKey,
} from "@/lib/format";
import { getMyRideIds } from "@/lib/myParticipations";
import { getMissingAdminGroups, getRegisteredCaptains } from "@/lib/admins";
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

  // Indexation O(1) de toutes les participations, capitaines et groupes manquants :
  // élimine des dizaines d'itérations et de recalculs redondants lors du scroll.
  const { partsByRideId, adminsByRideId, missingByRideId } = useMemo(() => {
    const partsMap: Record<string, Participation[]> = {};
    for (const p of currentParticipations) {
      if (!partsMap[p.ride_id]) partsMap[p.ride_id] = [];
      partsMap[p.ride_id].push(p);
    }
    const adminsMap: Record<string, ReturnType<typeof getRegisteredCaptains>> = {};
    const missingMap: Record<string, ReturnType<typeof getMissingAdminGroups>> = {};
    const allRides = [...featured, ...rest];
    for (const r of allRides) {
      const parts = partsMap[r.id] || [];
      const admins = getRegisteredCaptains(parts, r.description);
      adminsMap[r.id] = admins;
      const groups = (r.ride_groups || []).map((g) => g.group_level);
      missingMap[r.id] = getMissingAdminGroups(groups, admins);
    }
    return { partsByRideId: partsMap, adminsByRideId: adminsMap, missingByRideId: missingMap };
  }, [currentParticipations, featured, rest]);

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
              <FeaturedHero
                key={ride.id}
                ride={ride}
                participantCount={partsByRideId[ride.id]?.length || 0}
                isJoined={myRideIds.has(ride.id)}
                weather={weatherByRideId?.[ride.id]}
                onQuickAction={(r) => setSelectedRideForModal(r)}
                registeredAdmins={adminsByRideId[ride.id]}
                missingAdminGroups={missingByRideId[ride.id]}
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
              const parts = partsByRideId[r.id] || [];
              const wKey = weekKey(r.ride_date);
              const isNewWeek = i === 0 || weekKey(list[i - 1].ride_date) !== wKey;
              return (
                <Fragment key={r.id}>
                  {isNewWeek && <WeekDivider label={fmtWeekLabel(r.ride_date)} />}
                  <RideCard
                    key={r.id}
                    ride={r}
                    participantCount={parts.length}
                    participantPreview={parts.map((p) => ({ id: p.id, name: p.participant_name }))}
                    isJoined={myRideIds.has(r.id)}
                    weather={weatherByRideId?.[r.id]}
                    onQuickAction={(ride) => setSelectedRideForModal(ride)}
                    registeredAdmins={adminsByRideId[r.id]}
                    missingAdminGroups={missingByRideId[r.id]}
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
