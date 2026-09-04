import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchParticipationsForRide, fetchRide } from "@/lib/queries";
import { RideMap } from "@/components/RideMap";
import { ElevationChart } from "@/components/ElevationChart";
import { GroupBadge } from "@/components/GroupBadge";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icons";
import { JoinPanel } from "@/components/JoinPanel";
import { fmtDateLong, fmtKm, fmtM, fmtTime, isPastDate } from "@/lib/format";
import type { GroupLevel } from "@/lib/types";

export default async function RideDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const ride = await fetchRide(supabase, params.id);
  if (!ride) notFound();

  const participations = await fetchParticipationsForRide(supabase, ride.id);
  const past = isPastDate(ride.ride_date);
  const groups = (ride.ride_groups || []).map((g) => g.group_level);

  const groupCounts: Record<GroupLevel, number> = { vert: 0, rouge: 0, violet: 0 };
  participations.forEach((p) => groupCounts[p.group_level]++);

  const gpxUrl = ride.gpx_path
    ? supabase.storage.from("gpx").getPublicUrl(ride.gpx_path).data.publicUrl
    : null;

  return (
    <div>
      <div className="flex items-center justify-between px-5 pb-2 pt-5">
        <Link
          href="/rides"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/[0.08] bg-white dark:border-white/10 dark:bg-[#1A1422]"
        >
          <Icon name="chevL" size={18} />
        </Link>
        {gpxUrl && (
          <a
            href={gpxUrl}
            download
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/[0.08] bg-white dark:border-white/10 dark:bg-[#1A1422]"
          >
            <Icon name="download" size={17} />
          </a>
        )}
      </div>

      <div className="px-5 pb-4">
        <h1 className="mb-2 font-display text-[28px] leading-tight tracking-wide">{ride.title}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-black/50 dark:text-white/50">
          <span className="flex items-center gap-1.5"><Icon name="bell" size={14} className="text-sps-violet600 dark:text-sps-violet400" /> {fmtDateLong(ride.ride_date)}</span>
          <span className="flex items-center gap-1.5"><Icon name="target" size={14} className="text-sps-violet600 dark:text-sps-violet400" /> {fmtTime(ride.ride_time)}</span>
          <span className="flex items-center gap-1.5"><Icon name="route" size={14} className="text-sps-violet600 dark:text-sps-violet400" /> {ride.place}</span>
        </div>
      </div>

      <div className="mx-5 mb-4 h-[220px] overflow-hidden rounded-[22px] border border-black/[0.06] dark:border-white/10">
        <RideMap points={ride.route_points} className="h-full w-full" />
      </div>

      {ride.route_elevations && (
        <div className="px-5 pb-1">
          <ElevationChart elevations={ride.route_elevations} />
        </div>
      )}

      <div className="flex gap-2.5 px-5 py-4">
        <Stat value={fmtKm(ride.distance_km)} label="Distance" />
        <Stat value={fmtM(ride.elevation_gain_m)} label="D+" />
        <Stat value={speedRangeLabel(groups)} label="km/h" />
      </div>

      <div className="px-5 pb-1.5">
        <h2 className="font-display text-xl tracking-wide">Groupes</h2>
      </div>
      <div className="flex flex-col gap-2 px-5 pb-1">
        {groups.map((g) => (
          <div
            key={g}
            className="flex items-center justify-between rounded-2xl border border-black/[0.06] bg-white px-3.5 py-2.5 dark:border-white/10 dark:bg-[#1A1422]"
          >
            <GroupBadge group={g} />
            <span className="text-xs text-black/45 dark:text-white/45">
              {groupCounts[g]} participant{groupCounts[g] > 1 ? "s" : ""}
            </span>
          </div>
        ))}
      </div>

      <div className="px-5 py-4 text-[13.5px] leading-relaxed text-black/60 dark:text-white/60">
        <h4 className="mb-2 font-display text-sm tracking-wide text-black dark:text-white">Description</h4>
        {ride.description || "Pas de description pour cette sortie."}
      </div>

      <div className="px-5 pb-2">
        <JoinPanel rideId={ride.id} availableGroups={groups} isPast={past} participants={participations} />
      </div>

      <div className="flex gap-2.5 px-5 pb-2 pt-3">
        {gpxUrl && (
          <a
            href={gpxUrl}
            download
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white py-3 text-[13px] font-bold dark:border-white/15 dark:bg-[#1A1422]"
          >
            <Icon name="download" size={15} /> Télécharger GPX
          </a>
        )}
        {ride.strava_url && (
          <a
            href={ride.strava_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white py-3 text-[13px] font-bold dark:border-white/15 dark:bg-[#1A1422]"
          >
            <Icon name="external" size={15} /> Ouvrir sur Strava
          </a>
        )}
      </div>

      <div className="flex items-center justify-between px-5 pb-2.5 pt-5">
        <h2 className="font-display text-xl tracking-wide">Participants — {participations.length}</h2>
      </div>
      <div className="mx-5 mb-6 overflow-hidden rounded-2xl border border-black/[0.06] bg-white dark:border-white/10 dark:bg-[#1A1422]">
        {participations.length === 0 ? (
          <p className="p-6 text-center text-sm text-black/40 dark:text-white/40">Personne n&apos;est encore inscrit.</p>
        ) : (
          participations.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <Avatar name={p.participant_name} seed={p.participant_name} />
              <span className="flex-1 text-[13.5px] font-bold">{p.participant_name}</span>
              <GroupBadge group={p.group_level} withRange={false} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-black/[0.06] bg-white py-3 text-center dark:border-white/10 dark:bg-[#1A1422]">
      <span className="block font-display text-[21px] leading-none">{value}</span>
      <span className="mt-1 block text-[10px] uppercase tracking-wide text-black/35 dark:text-white/35">{label}</span>
    </div>
  );
}

function speedRangeLabel(groups: GroupLevel[]): string {
  const lows: Record<GroupLevel, number> = { vert: 24, rouge: 26, violet: 28 };
  const highs: Record<GroupLevel, number | null> = { vert: 26, rouge: 27, violet: null };
  const low = Math.min(...groups.map((g) => lows[g]));
  const hasViolet = groups.includes("violet");
  const high = hasViolet ? "28+" : Math.max(...groups.map((g) => highs[g] || 0));
  return `${low}–${high}`;
}
