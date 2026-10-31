"use client";

import Link from "next/link";
import { Icon } from "@/components/Icons";
import { GroupBadge } from "@/components/GroupBadge";
import { AdminBadge } from "@/components/AdminBadge";
import { AdminOnly } from "@/components/AdminOnly";
import { PlaceLink } from "@/components/PlaceLink";
import { RideWeatherBadge } from "@/components/RideWeatherBadge";
import { cleanRideTitle, detectRideGroup, formatRideDisplayTitle, getRideEffectiveGroups } from "@/lib/rideGroup";
import { daysUntil, fmtDateLong, fmtKm, fmtM, fmtTime } from "@/lib/format";
import { GROUP_INFO, type GroupLevel, type Ride } from "@/lib/types";
import type { RideWeather } from "@/lib/weather";

export function V2FeaturedHero({
  ride,
  participantCount,
  isJoined,
  weather,
  onQuickAction,
  registeredAdmins,
  missingAdminGroups,
  hrefPrefix = "/v2/rides",
}: {
  ride: Ride;
  participantCount: number;
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
    ? "bg-gradient-to-b from-transparent via-[#DC3D3D] to-transparent shadow-[3px_0_16px_rgba(220,61,61,0.8)]"
    : detectedGroup === "vert"
      ? "bg-gradient-to-b from-transparent via-[#1F9D63] to-transparent shadow-[3px_0_18px_rgba(31,157,99,0.9)]"
      : detectedGroup === "violet"
        ? "bg-gradient-to-b from-transparent via-[#AA26FF] to-transparent shadow-[3px_0_22px_rgba(170,38,255,1)]"
        : null;

  return (
    <div className="relative group block overflow-hidden rounded-[32px] border-2 border-violet-200/90 bg-white p-5 text-neutral-950 shadow-[0_16px_36px_-6px_rgba(109,40,217,0.12)] ring-1 ring-black/[0.04] transition-all duration-300 dark:border dark:border-white/20 dark:bg-gradient-to-br dark:from-[#1E0938] dark:via-[#120524] dark:to-[#080210] dark:text-white dark:shadow-[0_24px_50px_-12px_rgba(124,58,237,0.45)] dark:ring-white/10">
      {/* Ambient background glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-100/60 blur-3xl dark:bg-[#AA26FF]/25"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-purple-100/60 blur-3xl dark:bg-violet-600/35"
      />

      {/* Speedline glowing on the left edge */}
      {groupSpeedline && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 w-[4.5px] rounded-r-full ${groupSpeedline}`}
        />
      )}

      {/* Header status bar */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-full border border-violet-300/80 bg-violet-100/90 px-3.5 py-1 text-[11px] font-black uppercase tracking-widest text-violet-950 shadow-xs dark:border-white/25 dark:bg-white/10 dark:text-white">
          {daysUntil(ride.ride_date) === 0
            ? "Aujourd'hui"
            : daysUntil(ride.ride_date) === 1
              ? "Demain"
              : fmtDateLong(ride.ride_date)}
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
              className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-50 px-3.5 py-1 text-[11.5px] font-black text-emerald-800 shadow-xs transition hover:bg-emerald-100 active:scale-95 dark:border-emerald-400/50 dark:bg-emerald-500/25 dark:text-emerald-200"
            >
              <Icon name="check" size={13} /> Inscrit ✓
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
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sps-violet600 to-[#AA26FF] px-3.5 py-1 text-[11.5px] font-black text-white shadow-md shadow-violet-600/30 transition hover:brightness-110 active:scale-95 dark:border-white/35 dark:bg-white/20 dark:text-white dark:hover:bg-white/30"
            >
              <Icon name="plus" size={13} /> Participer
            </button>
          )
        )}
      </div>

      {/* Ride Title & Place */}
      <div className="relative z-10 mt-3 mb-3.5">
        <h2 className="font-display text-[21px] sm:text-[23px] font-black leading-snug tracking-wide text-neutral-950 drop-shadow-xs dark:text-white">
          <Link href={`${hrefPrefix}/${ride.id}`} className="hover:opacity-90 transition">
            {effectiveGroups.map((g) => (
              <span key={g} className="mr-2 inline-flex align-middle -translate-y-[1px]">
                <GroupBadge group={g} withRange={false} size="sm" pulse={true} />
              </span>
            ))}
            <span className="align-middle">{cleanRideTitle(ride.title)}</span>
          </Link>
        </h2>
        <div className="mt-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap text-[12.5px] text-neutral-800 font-semibold dark:text-violet-200/90">
          <span className="font-black text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-lg border border-neutral-200/80 flex-shrink-0 dark:border-transparent dark:bg-white/10 dark:text-white">
            {fmtTime(ride.ride_time)}
          </span>
          <span className="text-black/30 flex-shrink-0 dark:text-white/40">·</span>
          <span className="flex items-center gap-1 flex-shrink-0 min-w-0 font-bold text-neutral-900 dark:text-white">
            <Icon name="flag" size={13} className="text-sps-violet600 dark:text-[#AA26FF] flex-shrink-0" />
            <PlaceLink place={ride.place} placeUrl={ride.place_url} />
          </span>
          {(registeredAdmins || (missingAdminGroups && missingAdminGroups.length > 0)) && (
            <AdminOnly>
              <span className="text-black/30 flex-shrink-0 dark:text-white/40">·</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[11px] font-black text-neutral-900 whitespace-nowrap flex-shrink-0 dark:text-violet-200/90">
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

      {/* Telemetry Bento Grid - Compact & Refined */}
      <div className="relative z-10 mb-3 grid grid-cols-3 gap-1.5 text-center">
        <div className="flex flex-col items-center justify-center rounded-xl border border-violet-200/90 bg-violet-50/60 px-1 py-1.5 text-center shadow-xs dark:border-white/10 dark:bg-black/35">
          <span className="block text-[8.5px] font-black uppercase tracking-wider text-violet-900 dark:text-violet-300/70">
            Distance
          </span>
          <span className="font-display text-base sm:text-lg font-black leading-tight text-neutral-950 dark:text-white">
            {fmtKm(ride.distance_km)}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-violet-200/90 bg-violet-50/60 px-1 py-1.5 text-center shadow-xs dark:border-white/10 dark:bg-black/35">
          <span className="block text-[8.5px] font-black uppercase tracking-wider text-violet-900 dark:text-violet-300/70">
            Dénivelé
          </span>
          <span className="font-display text-base sm:text-lg font-black leading-tight text-neutral-950 dark:text-white">
            {fmtM(ride.elevation_gain_m)}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-violet-200/90 bg-violet-50/60 px-1 py-1.5 text-center shadow-xs dark:border-white/10 dark:bg-black/35">
          <span className="block text-[8.5px] font-black uppercase tracking-wider text-violet-900 dark:text-violet-300/70">
            Participants
          </span>
          <span className="font-display text-base sm:text-lg font-black leading-tight text-neutral-950 dark:text-white">
            {participantCount}
          </span>
        </div>
      </div>

      {/* Weather Badge (Single Line) */}
      {weather && weather.suitabilityScore !== undefined && (
        <div className="relative z-10 mb-3 flex items-center justify-center">
          <RideWeatherBadge weather={weather} variant="featured" />
        </div>
      )}

      {/* Primary CTA - Centered with > */}
      <Link
        href={`${hrefPrefix}/${ride.id}`}
        prefetch={true}
        className="group/btn relative z-10 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sps-violet600 to-[#AA26FF] px-4.5 py-3 text-sm font-black text-white shadow-lg shadow-violet-600/30 transition-all duration-200 hover:brightness-105 active:scale-[0.99] dark:border dark:border-white/15 dark:bg-white/[0.06] dark:shadow-none dark:hover:border-white/25 dark:hover:bg-white/[0.12]"
      >
        <span className="tracking-wide">Voir la sortie</span>
        <Icon
          name="chevR"
          size={15}
          className="text-white/90 transition-transform duration-200 group-hover/btn:translate-x-1 dark:text-violet-300"
        />
      </Link>
    </div>
  );
}
