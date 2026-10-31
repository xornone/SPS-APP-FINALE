import Link from "next/link";
import { GroupBadge } from "./GroupBadge";
import { Avatar } from "./Avatar";
import { Icon } from "./Icons";
import { AdminOnly } from "./AdminOnly";
import { AdminBadge } from "./AdminBadge";
import { PlaceLink } from "./PlaceLink";
import { RideWeatherBadge } from "./RideWeatherBadge";
import { cleanRideTitle, detectRideGroup, formatRideDisplayTitle, getRideEffectiveGroups } from "@/lib/rideGroup";
import { fmtDateShort, fmtKm, fmtM, fmtTime } from "@/lib/format";
import { GROUP_INFO, type Ride } from "@/lib/types";
import { getMissingAdminGroups, type RegisteredAdmin } from "@/lib/admins";
import type { RideWeather } from "@/lib/weather";

export function RideCard({
  ride,
  participantCount,
  participantPreview,
  isJoined,
  registeredAdmins,
  onQuickAction,
  weather,
}: {
  ride: Ride;
  participantCount: number;
  participantPreview: { id: string; name: string }[];
  isJoined: boolean;
  /** Admins du club inscrits (avec leur groupe), affiche uniquement aux
   * autres admins (voir lib/admins.ts). Omis sur l'onglet Sorties, fourni
   * sur l'Accueil. */
  registeredAdmins?: RegisteredAdmin[];
  /** Action rapide pour s'inscrire ou se desinscrire directement depuis la carte. */
  onQuickAction?: (ride: Ride) => void;
  weather?: RideWeather | null;
}) {
  const missingAdminGroups = registeredAdmins
    ? getMissingAdminGroups((ride.ride_groups || []).map((g) => g.group_level), registeredAdmins)
    : [];

  const detectedGroup = detectRideGroup(ride);
  const effectiveGroups = getRideEffectiveGroups(ride);
  const displayTitle = formatRideDisplayTitle(ride);

  const groupSpeedline = detectedGroup === "rouge"
    ? "bg-gradient-to-b from-transparent via-[#DC3D3D]/80 to-transparent shadow-[1px_0_6px_rgba(220,61,61,0.3)]"
    : detectedGroup === "vert"
      ? "bg-gradient-to-b from-transparent via-[#1F9D63] to-transparent shadow-[1px_0_8px_rgba(31,157,99,0.5)]"
      : detectedGroup === "violet"
        ? "bg-gradient-to-b from-transparent via-[#AA26FF] to-transparent shadow-[1px_0_10px_rgba(170,38,255,0.6)]"
        : null;

  return (
    <Link
      href={`/rides/${ride.id}`}
      prefetch={true}
      className="relative flex flex-col gap-2.5 overflow-hidden rounded-[20px] border border-black/[0.06] bg-white p-4 shadow-cardSm transition dark:border-white/10 dark:bg-[#1A1422]"
    >
      {groupSpeedline && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 w-[2.5px] ${groupSpeedline}`}
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-[13px] tracking-wide text-sps-violet600 dark:text-sps-violet400">
          {fmtDateShort(ride.ride_date)} · {fmtTime(ride.ride_time)}
        </span>
        {onQuickAction ? (
          isJoined ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickAction(ride);
              }}
              title="Gérer mon inscription ou me désinscrire"
              className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-extrabold text-emerald-600 transition hover:bg-emerald-500/25 active:scale-95 dark:text-emerald-400"
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
              className="flex items-center gap-1 rounded-full bg-sps-violet600 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-sm transition hover:bg-sps-violet700 active:scale-95"
            >
              <Icon name="plus" size={12} /> Participer
            </button>
          )
        ) : isJoined ? (
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10.5px] font-extrabold text-emerald-600 dark:text-emerald-400">
            Inscrit ✓
          </span>
        ) : (
          <span className="rounded-full border border-black/10 px-2.5 py-1 text-[10.5px] font-extrabold text-black/40 dark:border-white/15 dark:text-white/40">
            Ouvert
          </span>
        )}
      </div>
      <h3 className="text-[16.5px] font-extrabold leading-tight text-neutral-900 dark:text-white">
        {effectiveGroups.map((g) => (
          <span key={g} className="mr-2 inline-flex align-middle -translate-y-[1px]">
            <GroupBadge group={g} withRange={false} size="xs" pulse={true} />
          </span>
        ))}
        <span className="align-middle">{cleanRideTitle(ride.title)}</span>
      </h3>
      <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-black/50 dark:text-white/50">
        <Icon name="flag" size={13} /> <PlaceLink place={ride.place} placeUrl={ride.place_url} />
      </div>
      <div className="flex items-center justify-center gap-6 py-1 text-center">
        <div className="text-center">
          <b className="text-sm">{fmtKm(ride.distance_km)}</b>
          <span className="ml-1 text-[10px] uppercase text-black/35 dark:text-white/35">distance</span>
        </div>
        <div className="text-center">
          <b className="text-sm">{fmtM(ride.elevation_gain_m)}</b>
          <span className="ml-1 text-[10px] uppercase text-black/35 dark:text-white/35">D+</span>
        </div>
      </div>
      {weather && weather.suitabilityScore !== undefined && (
        <div className="flex items-center justify-center py-0.5">
          <RideWeatherBadge weather={weather} />
        </div>
      )}
      <div className="flex items-center justify-between border-t border-black/[0.06] pt-2.5 dark:border-white/10">
        <div className="flex">
          {participantPreview.slice(0, 4).map((p, i) => (
            <Avatar
              key={p.id}
              name={p.name}
              seed={p.name}
              size="sm"
              className={`ring-2 ring-white dark:ring-[#1A1422] ${i > 0 ? "-ml-2" : ""}`}
            />
          ))}
        </div>
        <span className="text-xs font-semibold text-black/50 dark:text-white/50">
          {participantCount} participant{participantCount > 1 ? "s" : ""}
        </span>
      </div>
      {registeredAdmins && (
        <AdminOnly>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10.5px] font-bold text-sps-violet600 dark:text-sps-violet400">
              👑 {registeredAdmins.length}
            </span>
            {registeredAdmins.map((a) => (
              <AdminBadge key={a.name} name={a.name} group={a.group} />
            ))}
            {missingAdminGroups.length > 0 && (
              <span
                className="text-amber-600 dark:text-amber-400 cursor-help"
                title={`Pas d'admin en ${missingAdminGroups.map((g) => GROUP_INFO[g].label).join(", ")}`}
              >
                ⚠️
              </span>
            )}
          </div>
        </AdminOnly>
      )}
    </Link>
  );
}
