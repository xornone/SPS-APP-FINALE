import { Fragment } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchAllParticipations, fetchRides } from "@/lib/queries";
import { RideCard } from "@/components/RideCard";
import { WeekDivider } from "@/components/WeekDivider";
import { GroupBadge } from "@/components/GroupBadge";
import { NotifBell } from "@/components/NotifBell";
import { Icon } from "@/components/Icons";
import { daysUntil, fmtDateLong, fmtKm, fmtM, fmtTime, fmtWeekLabel, isPastDate, weekKey } from "@/lib/format";

export default async function HomePage() {
  const supabase = createClient();
  const [rides, participations] = await Promise.all([fetchRides(supabase), fetchAllParticipations(supabase)]);

  const upcoming = rides.filter((r) => !isPastDate(r.ride_date));
  const next = upcoming[0];
  const rest = upcoming.slice(1, 5);

  const countsFor = (rideId: string) => participations.filter((p) => p.ride_id === rideId);

  return (
    <div>
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <h1 className="font-display text-[26px] tracking-wide">Bonjour 👋</h1>
        <NotifBell />
      </div>

      {next && (
        <>
          <div className="px-5 pb-2">
            <h2 className="font-display text-xl tracking-wide">Prochaine sortie</h2>
          </div>
          <Link
            href={`/rides/${next.id}`}
            className="relative mx-5 mb-6 block overflow-hidden rounded-[26px] bg-gradient-to-br from-sps-violet700 to-sps-violet900 p-5 text-[#F4EEFF] shadow-card"
          >
            <span className="text-[11.5px] font-extrabold uppercase tracking-wide text-violet-200">
              {daysUntil(next.ride_date) === 0 ? "Aujourd'hui" : daysUntil(next.ride_date) === 1 ? "Demain" : fmtDateLong(next.ride_date)}
            </span>
            <h3 className="mb-1 mt-1.5 font-display text-[27px] leading-tight">{next.title}</h3>
            <p className="mb-3.5 text-[13px] text-violet-200/90">
              {fmtTime(next.ride_time)} · {next.place}
            </p>
            <div className="mb-4 flex gap-4">
              <div>
                <span className="block font-display text-[22px] leading-none">{fmtKm(next.distance_km)}</span>
                <span className="text-[10.5px] uppercase text-violet-300">Distance</span>
              </div>
              <div>
                <span className="block font-display text-[22px] leading-none">{fmtM(next.elevation_gain_m)}</span>
                <span className="text-[10.5px] uppercase text-violet-300">D+</span>
              </div>
              <div>
                <span className="block font-display text-[22px] leading-none">{countsFor(next.id).length}</span>
                <span className="text-[10.5px] uppercase text-violet-300">Participants</span>
              </div>
            </div>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {(next.ride_groups || []).map((g) => (
                <GroupBadge key={g.group_level} group={g.group_level} withRange={false} onDark />
              ))}
            </div>
            <span className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sps-violet500 to-sps-violet700 px-4 py-3 text-sm font-extrabold shadow-lg">
              Voir la sortie <Icon name="chevR" size={15} />
            </span>
          </Link>
        </>
      )}

      <div className="mb-2 flex items-baseline justify-between px-5">
        <h2 className="font-display text-xl tracking-wide">Les prochaines sorties</h2>
        <Link href="/rides" className="text-xs font-bold text-sps-violet600 dark:text-sps-violet400">
          Tout voir
        </Link>
      </div>
      <div className="flex flex-col gap-3 px-5">
        {rest.length === 0 && (
          <p className="rounded-2xl border border-dashed border-black/10 p-6 text-center text-sm text-black/40 dark:border-white/10 dark:text-white/40">
            Aucune autre sortie programmée.
          </p>
        )}
        {rest.map((r, i) => {
          const parts = countsFor(r.id);
          const wKey = weekKey(r.ride_date);
          const isNewWeek = i === 0 || weekKey(rest[i - 1].ride_date) !== wKey;
          return (
            <Fragment key={r.id}>
              {isNewWeek && <WeekDivider label={fmtWeekLabel(r.ride_date)} />}
              <RideCard
                ride={r}
                participantCount={parts.length}
                participantPreview={parts.map((p) => ({ id: p.id, name: p.participant_name }))}
                isJoined={false}
              />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
