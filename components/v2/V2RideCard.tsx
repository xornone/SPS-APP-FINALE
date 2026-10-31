"use client";

import Link from "next/link";
import { GroupBadge } from "@/components/GroupBadge";
import { AdminBadge } from "@/components/AdminBadge";
import { AdminOnly } from "@/components/AdminOnly";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icons";
import { PlaceLink } from "@/components/PlaceLink";
import { RideWeatherBadge } from "@/components/RideWeatherBadge";
import { cleanRideTitle, detectRideGroup, formatRideDisplayTitle, getRideEffectiveGroups } from "@/lib/rideGroup";
import { fmtDateShort, fmtKm, fmtM, fmtTime } from "@/lib/format";
import { GROUP_INFO, type GroupLevel, type Ride } from "@/lib/types";
import type { RideWeather } from "@/lib/weather";

export function V2RideCard({
  ride,
  participantCount,
  participantPreview,
  isJoined,
  weather,
  onQuickAction,
  registeredAdmins,
  missingAdminGroups,
  hrefPrefix = "/v2/rides",
}: {
  ride: Ride;
  participantCount: number;
  participantPreview: { id: string; name: string }[];
  isJoined: boolean;
  weather?: RideWeather | null;
  onQuickAction?: (ride: Ride) => void;
  registeredAdmins?: { name: string; group: GroupLevel }[];
  missingAdminGroups?: GroupLevel[];
  hrefPrefix?: string;
}) {
  const detectedGroup = detectRideGroup(ride);
  const effectiveGroups = getRideEffectiveGroups(ride);
  const displayTitle = formatRideDisplayTitle(ride);

  const groupSpeedline = detectedGroup === "rouge"
    ? "bg-gradient-to-b from-transparent via-[#DC3D3D] to-transparent shadow-[2px_0_12px_rgba(220,61,61,0.6)]"
    : detectedGroup === "vert"
      ? "bg-gradient-to-b from-transparent via-[#1F9D63] to-transparent shadow-[2px_0_12px_rgba(31,157,99,0.7)]"
      : detectedGroup === "violet"
        ? "bg-gradient-to-b from-transparent via-[#AA26FF] to-transparent shadow-[2px_0_14px_rgba(170,38,255,0.8)]"
        : null;

  return (
    <Link
      href={`${hrefPrefix}/${ride.id}`}
      prefetch={true}
      className="group relative isolate flex flex-col gap-3.5 overflow-hidden rounded-[26px] border border-neutral-200/90 bg-white p-4.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-violet-400 hover:shadow-[0_12px_28px_-6px_rgba(124,58,237,0.18)] active:scale-[0.99] dark:border-white/[0.09] dark:bg-[#130B22]/75 dark:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.4)] dark:hover:border-white/20 dark:hover:bg-[#1A1030]/85"
    >
      {groupSpeedline && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 w-[3.5px] rounded-r-full ${groupSpeedline}`}
        />
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100/90 border border-violet-300/80 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-violet-950 shadow-xs dark:bg-white/[0.06] dark:border-white/10 dark:text-violet-200">
          <span>{fmtDateShort(ride.ride_date)}</span>
          <span className="opacity-40">·</span>
          <span>{fmtTime(ride.ride_time)}</span>
        </span>

        {onQuickAction && (
          isJoined ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickAction(ride);
              }}
              title="Gérer mon inscription ou me désinscrire"
              className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-800 transition hover:bg-emerald-100 active:scale-95 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-300"
            >
              <Icon name="check" size={12} /> Inscrit ✓
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickAction(ride);
              }}
              title="S'inscrire rapidement à cette sortie"
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sps-violet600 to-[#AA26FF] px-3 py-1 text-[11px] font-black text-white shadow-md shadow-violet-600/30 transition hover:brightness-110 active:scale-95"
            >
              <Icon name="plus" size={12} /> Participer
            </button>
          )
        )}
      </div>

      {/* Title & Place */}
      <div>
        <h3 className="font-display text-[17px] sm:text-[19px] font-black leading-snug tracking-wide text-neutral-950 transition-colors group-hover:text-violet-700 dark:text-white dark:group-hover:text-violet-200">
          {effectiveGroups.map((g) => (
            <span key={g} className="mr-2 inline-flex align-middle -translate-y-[1px]">
              <GroupBadge group={g} withRange={false} size="xs" pulse={true} />
            </span>
          ))}
          <span className="align-middle">{cleanRideTitle(ride.title)}</span>
        </h3>
        <div className="mt-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap text-[12px] font-bold text-neutral-800 dark:text-white/60">
          <span className="flex items-center gap-1 flex-shrink-0">
            <Icon name="flag" size={12} className="text-sps-violet600 dark:text-[#AA26FF] flex-shrink-0" />
            <PlaceLink place={ride.place} placeUrl={ride.place_url} />
          </span>
          {(registeredAdmins || (missingAdminGroups && missingAdminGroups.length > 0)) && (
            <AdminOnly>
              <span className="text-black/30 flex-shrink-0 dark:text-white/40">·</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10.5px] font-black text-neutral-900 whitespace-nowrap flex-shrink-0 dark:text-violet-200/90">
                  👑 {registeredAdmins?.length || 0}
                </span>
                {registeredAdmins?.map((a) => (
                  <AdminBadge key={a.name} name={a.name} group={a.group} />
                ))}
                {missingAdminGroups && missingAdminGroups.length > 0 && (
                  <span
                    className="text-amber-600 dark:text-amber-300 whitespace-nowrap flex-shrink-0 cursor-help"
                    title={`Pas d'admin en ${missingAdminGroups.map((g) => GROUP_INFO[g].label).join(", ")}`}
                  >
                    ⚠️
                  </span>
                )}
              </div>
            </AdminOnly>
          )}
        </div>
      </div>

      {/* Telemetry Bento - Compact Centered */}
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200/90 bg-neutral-50 px-1 py-1.5 text-center dark:border-white/10 dark:bg-white/[0.04]">
          <span className="text-[8.5px] font-black uppercase tracking-wider text-neutral-600 dark:text-violet-300/70">Distance</span>
          <span className="font-display text-base font-black leading-tight text-neutral-950 dark:text-white">{fmtKm(ride.distance_km)}</span>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200/90 bg-neutral-50 px-1 py-1.5 text-center dark:border-white/10 dark:bg-white/[0.04]">
          <span className="text-[8.5px] font-black uppercase tracking-wider text-neutral-600 dark:text-violet-300/70">Dénivelé</span>
          <span className="font-display text-base font-black leading-tight text-neutral-950 dark:text-white">{fmtM(ride.elevation_gain_m)}</span>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200/90 bg-neutral-50 px-1 py-1.5 text-center dark:border-white/10 dark:bg-white/[0.04]">
          <span className="text-[8.5px] font-black uppercase tracking-wider text-neutral-600 dark:text-violet-300/70">Participants</span>
          <span className="font-display text-base font-black leading-tight text-neutral-950 dark:text-white">{participantCount}</span>
        </div>
      </div>

      {/* Weather Badge (Single Line) */}
      {weather && weather.suitabilityScore !== undefined && (
        <div className="flex items-center justify-center pt-0.5">
          <RideWeatherBadge weather={weather} />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-neutral-200/80 pt-2.5 dark:border-white/[0.07]">
        <div className="flex items-center">
          {participantPreview.slice(0, 4).map((p, i) => (
            <Avatar
              key={p.id}
              name={p.name}
              seed={p.name}
              size="sm"
              className={`ring-2 ring-white dark:ring-[#130B22] ${i > 0 ? "-ml-2" : ""}`}
            />
          ))}
          {participantCount > 4 && (
            <span className="-ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 text-[9px] font-black text-neutral-800 ring-2 ring-white dark:bg-white/10 dark:text-white dark:ring-[#130B22]">
              +{participantCount - 4}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 text-xs font-black text-violet-700 transition-transform group-hover:translate-x-0.5 dark:text-violet-300">
          <span>Détails</span>
          <Icon name="chevR" size={13} />
        </span>
      </div>
    </Link>
  );
}
