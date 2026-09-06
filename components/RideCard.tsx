import Link from "next/link";
import { GroupBadge } from "./GroupBadge";
import { Avatar } from "./Avatar";
import { Icon } from "./Icons";
import { AdminOnly } from "./AdminOnly";
import { AdminBadge } from "./AdminBadge";
import { fmtDateShort, fmtKm, fmtM, fmtTime } from "@/lib/format";
import type { Ride } from "@/lib/types";
import type { RegisteredAdmin } from "@/lib/admins";

export function RideCard({
  ride,
  participantCount,
  participantPreview,
  isJoined,
  registeredAdmins,
}: {
  ride: Ride;
  participantCount: number;
  participantPreview: { id: string; name: string }[];
  isJoined: boolean;
  /** Admins du club inscrits (avec leur groupe), affiche uniquement aux
   * autres admins (voir lib/admins.ts). Omis sur l'onglet Sorties, fourni
   * sur l'Accueil. */
  registeredAdmins?: RegisteredAdmin[];
}) {
  return (
    <Link
      href={`/rides/${ride.id}`}
      className="flex flex-col gap-2.5 rounded-[20px] border border-black/[0.06] bg-white p-4 shadow-cardSm dark:border-white/10 dark:bg-[#1A1422]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-[13px] tracking-wide text-sps-violet600 dark:text-sps-violet400">
          {fmtDateShort(ride.ride_date)} · {fmtTime(ride.ride_time)}
        </span>
        {isJoined ? (
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10.5px] font-extrabold text-emerald-600 dark:text-emerald-400">
            Inscrit ✓
          </span>
        ) : (
          <span className="rounded-full border border-black/10 px-2.5 py-1 text-[10.5px] font-extrabold text-black/40 dark:border-white/15 dark:text-white/40">
            Ouvert
          </span>
        )}
      </div>
      <h3 className="text-[16.5px] font-extrabold leading-tight">{ride.title}</h3>
      <div className="flex items-center gap-1.5 text-[12.5px] text-black/50 dark:text-white/50">
        <Icon name="flag" size={13} /> {ride.place}
      </div>
      <div className="flex gap-4">
        <div>
          <b className="text-sm">{fmtKm(ride.distance_km)}</b>
          <span className="ml-1 text-[10px] uppercase text-black/35 dark:text-white/35">distance</span>
        </div>
        <div>
          <b className="text-sm">{fmtM(ride.elevation_gain_m)}</b>
          <span className="ml-1 text-[10px] uppercase text-black/35 dark:text-white/35">D+</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(ride.ride_groups || []).map((g) => (
          <GroupBadge key={g.group_level} group={g.group_level} />
        ))}
      </div>
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
          </div>
        </AdminOnly>
      )}
    </Link>
  );
}
