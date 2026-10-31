import Link from "next/link";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/publicClient";
import { fetchParticipationsForRide, fetchRide } from "@/lib/queries";
import { InteractiveRideTrack } from "@/components/InteractiveRideTrack";
import { GroupBadge } from "@/components/GroupBadge";
import { Icon } from "@/components/Icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RideParticipationSection } from "@/components/RideParticipationSection";
import { RideDescription } from "@/components/RideDescription";
import { buildRideShareMessage } from "@/lib/shareMessage";
import { shortRideCode } from "@/lib/shortLink";
import { GROUP_INFO, type GroupLevel } from "@/lib/types";
import { cleanRideTitle, getRideEffectiveGroups } from "@/lib/rideGroup";
import { fmtDateDimNov, fmtKm, fmtM, fmtTime, isPastDate } from "@/lib/format";
import {
  addMinutesToTimeString,
  estimateRideDurationMinutes,
  fetchRideWeather,
  formatDuration,
  getRideCoordinates,
} from "@/lib/weather";

export const dynamic = "force-dynamic";

export default async function V2RideDetailPage({ params }: { params: { id: string } }) {
  const supabase = createPublicClient();

  const ridePromise = fetchRide(supabase, params.id);
  const participationsPromise = fetchParticipationsForRide(supabase, params.id);

  const ride = await ridePromise;
  if (!ride) notFound();

  const groups = (ride.ride_groups || []).map((g) => g.group_level);
  const effectiveGroups = getRideEffectiveGroups(ride);

  const weatherPromise = getRideCoordinates(ride.route_points, ride.place).then((coords) =>
    coords
      ? fetchRideWeather(coords[0], coords[1], ride.ride_date, ride.ride_time, {
          distanceKm: ride.distance_km,
          elevationGainM: ride.elevation_gain_m,
          groups,
        })
      : null
  );

  const [participations, weather] = await Promise.all([
    participationsPromise,
    weatherPromise,
  ]);

  const past = isPastDate(ride.ride_date);

  const groupCounts: Record<GroupLevel, number> = { vert: 0, rouge: 0, violet: 0 };
  participations.forEach((p) => groupCounts[p.group_level]++);

  const gpxUrl = ride.gpx_path
    ? supabase.storage.from("gpx").getPublicUrl(ride.gpx_path).data.publicUrl
    : null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://spsapp2.vercel.app";
  const shareMessage = buildRideShareMessage(ride, groups, weather, `${siteUrl}/s/${shortRideCode(ride.id)}`);

  const durationMin =
    weather?.durationMinutes ??
    estimateRideDurationMinutes(ride.distance_km, ride.elevation_gain_m, groups);
  const durationFormatted = weather?.durationFormatted ?? formatDuration(durationMin);
  const departureTime = fmtTime(ride.ride_time);
  const arrivalTime =
    weather?.estimatedArrivalTime ?? addMinutesToTimeString(departureTime, durationMin);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-5 pb-1 pt-5">
        <Link
          href="/v2/home"
          prefetch={true}
          title="Retour aux sorties"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-neutral-900 shadow-xs transition hover:bg-neutral-100 active:scale-95 dark:border-white/10 dark:bg-[#130B22] dark:text-white"
        >
          <Icon name="chevL" size={18} />
        </Link>
        <div className="flex items-center gap-2">
          {gpxUrl && (
            <a
              href={gpxUrl}
              download
              title="Télécharger la trace GPX"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-neutral-900 shadow-xs transition hover:bg-neutral-100 active:scale-95 dark:border-white/10 dark:bg-[#130B22] dark:text-white"
            >
              <Icon name="download" size={17} />
            </a>
          )}
          <ThemeToggle />
        </div>
      </div>

      {/* Title & Metadata */}
      <div className="px-5 pb-1">
        <h1 className="mb-2 font-display text-[24px] sm:text-[27px] font-black leading-tight tracking-wide text-neutral-950 dark:text-white">
          {effectiveGroups.map((g) => (
            <span key={g} className="mr-2 inline-flex align-middle -translate-y-[1px]">
              <GroupBadge group={g} withRange={false} size="sm" pulse={true} />
            </span>
          ))}
          <span className="align-middle">{cleanRideTitle(ride.title)}</span>
        </h1>
        <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-[12px] font-bold text-neutral-700 no-scrollbar dark:text-white/60">
          <span className="flex items-center gap-1 flex-shrink-0">
            <Icon name="bell" size={13} className="text-sps-violet600 dark:text-[#AA26FF]" />
            <span>{fmtDateDimNov(ride.ride_date)}</span>
          </span>

          <span className="text-black/25 dark:text-white/25 flex-shrink-0">·</span>

          <span className="flex items-center gap-1 flex-shrink-0">
            <Icon name="target" size={13} className="text-sps-violet600 dark:text-[#AA26FF]" />
            <span>{departureTime} → ~{arrivalTime} ({durationFormatted})</span>
          </span>

          <span className="text-black/25 dark:text-white/25 flex-shrink-0">·</span>

          <span className="flex items-center gap-1 flex-shrink-0 min-w-0">
            <Icon name="flag" size={13} className="text-sps-violet600 dark:text-[#AA26FF] flex-shrink-0" />
            {ride.place_url ? (
              <a
                href={ride.place_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 underline decoration-dotted underline-offset-2 hover:text-black dark:hover:text-white truncate"
              >
                <span>{ride.place}</span>
                <Icon name="external" size={10} className="flex-shrink-0" />
              </a>
            ) : (
              <span className="truncate">{ride.place}</span>
            )}
          </span>
        </div>
      </div>

      {/* Interactive Track */}
      <InteractiveRideTrack
        points={ride.route_points}
        elevations={ride.route_elevations}
        distanceKm={ride.distance_km}
        weather={weather}
      />

      {/* Telemetry Bento - Same 3 stats as V1, styled with V2 card style */}
      <div className="grid grid-cols-3 gap-2 px-5 py-2">
        <Stat value={fmtKm(ride.distance_km)} label="Distance" />
        <Stat value={fmtM(ride.elevation_gain_m)} label="D+" />
        <Stat value={speedRangeLabel(groups)} label="km/h" />
      </div>

      {/* Groupes */}
      <div className="px-5 pb-1">
        <h2 className="font-display text-xl tracking-wide text-neutral-900 dark:text-white uppercase">Groupes</h2>
      </div>
      <div className="flex flex-col gap-2 px-5 pb-1">
        {groups.map((g) => (
          <div
            key={g}
            className="flex items-center justify-between rounded-2xl border border-neutral-200/90 bg-white p-3.5 shadow-xs transition hover:border-violet-300 dark:border-white/10 dark:bg-[#130B22]/80 dark:hover:border-white/20"
          >
            <div className="flex flex-col gap-1">
              <GroupBadge group={g} />
              <span className="pl-0.5 text-[11px] font-semibold text-neutral-500 dark:text-white/45">{GROUP_INFO[g].flat}</span>
            </div>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-black text-neutral-700 dark:bg-white/[0.08] dark:text-white">
              {groupCounts[g]} participant{groupCounts[g] > 1 ? "s" : ""}
            </span>
          </div>
        ))}
      </div>

      {/* Description */}
      <RideDescription description={ride.description} showSafetyNotice={ride.show_safety_notice !== false} />

      {/* Participation & Inscriptions */}
      <RideParticipationSection
        rideId={ride.id}
        availableGroups={groups}
        isPast={past}
        initialParticipants={participations}
        gpxUrl={gpxUrl}
        stravaUrl={ride.strava_url}
        shareMessage={shareMessage}
      />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200/90 bg-white py-3 px-2 text-center shadow-xs transition dark:border-white/10 dark:bg-[#130B22]/80">
      <span className="block text-[9px] font-black uppercase tracking-wider text-neutral-500 dark:text-violet-300/70">
        {label}
      </span>
      <span className="mt-0.5 block font-display text-lg sm:text-xl font-black leading-tight text-neutral-950 dark:text-white">
        {value}
      </span>
    </div>
  );
}

function speedRangeLabel(groups: GroupLevel[]): string {
  if (!groups || groups.length === 0) return "—";
  const lows: Record<GroupLevel, number> = { vert: 24, rouge: 26, violet: 28 };
  const highs: Record<GroupLevel, number | null> = { vert: 26, rouge: 28, violet: null };
  const low = Math.min(...groups.map((g) => lows[g]));
  const hasViolet = groups.includes("violet");
  if (low === 28 && hasViolet) return "28+";
  const high = hasViolet ? "28+" : Math.max(...groups.map((g) => highs[g] || 0));
  return `${low}–${high}`;
}
