import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/publicClient";
import { fetchAllParticipations, fetchRides } from "@/lib/queries";
import { Icon } from "@/components/Icons";
import { V2TopBar } from "@/components/v2/V2TopBar";
import { MemberAssiduityRanking } from "@/components/MemberAssiduityRanking";
import { buildAssiduityRankingFromParticipations } from "@/lib/assiduity";
import { fmtKm, fmtM, isPastDate } from "@/lib/format";
import { GROUP_INFO, type GroupLevel, type Ride } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function V2ClassementPage() {
  const supabase = createPublicClient();
  const [rides, participations] = await Promise.all([
    fetchRides(supabase),
    fetchAllParticipations(supabase),
  ]);

  const ridesById = new Map(rides.map((r) => [r.id, r]));
  const past = participations
    .map((p) => ({ ...p, ride: ridesById.get(p.ride_id) }))
    .filter((p) => p.ride && isPastDate(p.ride.ride_date));

  const totalKm = past.reduce((sum, p) => sum + (p.ride?.distance_km || 0), 0);
  const totalElevation = past.reduce((sum, p) => sum + (p.ride?.elevation_gain_m || 0), 0);
  const totalRidesOrganized = rides.length;
  const avgParticipants = totalRidesOrganized > 0 ? participations.length / totalRidesOrganized : 0;

  const groupCounts: Record<GroupLevel, number> = { vert: 0, rouge: 0, violet: 0 };
  participations.forEach((p) => groupCounts[p.group_level]++);
  const totalGroupCounts = participations.length;

  const participantCountByRide = new Map<string, number>();
  participations.forEach((p) =>
    participantCountByRide.set(p.ride_id, (participantCountByRide.get(p.ride_id) || 0) + 1)
  );
  const longestRide = rides.reduce<Ride | null>(
    (max, r) => (!max || r.distance_km > max.distance_km ? r : max),
    null
  );
  const hilliestRide = rides.reduce<Ride | null>(
    (max, r) => (!max || r.elevation_gain_m > max.elevation_gain_m ? r : max),
    null
  );
  const mostAttendedRide = rides.reduce<Ride | null>((max, r) => {
    const count = participantCountByRide.get(r.id) || 0;
    const maxCount = max ? participantCountByRide.get(max.id) || 0 : -1;
    return count > maxCount ? r : max;
  }, null);
  const mostAttendedCount = mostAttendedRide ? participantCountByRide.get(mostAttendedRide.id) || 0 : 0;

  const perYear = new Map<number, number>();
  rides.forEach((r) => {
    const year = Number(r.ride_date.slice(0, 4));
    if (!Number.isNaN(year)) perYear.set(year, (perYear.get(year) || 0) + 1);
  });
  const yearRows = Array.from(perYear.entries()).sort((a, b) => b[0] - a[0]);
  const maxYearCount = Math.max(...yearRows.map(([, c]) => c), 1);

  const now = new Date();
  const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const buckets: { label: string; km: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ label: MONTHS[dt.getMonth()], km: 0 });
  }
  past.forEach((p) => {
    const [y, m] = p.ride!.ride_date.split("-").map(Number);
    const idx = buckets.length - 1 - (now.getFullYear() * 12 + now.getMonth() - (y * 12 + (m - 1)));
    if (idx >= 0 && idx < buckets.length) buckets[idx].km += p.ride!.distance_km;
  });
  const maxKm = Math.max(...buckets.map((b) => b.km), 1);

  const assiduityRanking = buildAssiduityRankingFromParticipations(past);

  return (
    <div className="flex flex-col gap-6">
      <V2TopBar title="Statistiques SPS" subtitle="Club Cycliste" />

      {/* Hero Bento Grid */}
      <section className="px-5">
        <div className="grid grid-cols-2 gap-2">
          <StatBento
            label="Parcourus par les membres"
            value={`${Math.round(totalKm).toLocaleString("fr-FR")} km`}
            accent="#AA26FF"
          />
          <StatBento
            label="D+ cumulé"
            value={`${Math.round(totalElevation).toLocaleString("fr-FR")} m`}
            accent="#8B5CF6"
          />
          <StatBento
            label="Sorties organisées"
            value={String(totalRidesOrganized)}
            accent="#34D399"
          />
          <StatBento
            label="Participants en moyenne / sortie"
            value={avgParticipants.toFixed(1).replace(".", ",")}
            accent="#F59E0B"
          />
        </div>
      </section>

      {/* 6-Month Illuminated Activity Chart */}
      <section className="px-5">
        <div className="rounded-[28px] border border-neutral-200/90 bg-white p-5 shadow-xs transition dark:border-white/10 dark:bg-[#130B22]/80">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl uppercase tracking-wide text-neutral-950 dark:text-white font-black">
                Activité du club
              </h2>
              <span className="text-[11px] font-semibold text-neutral-500 dark:text-white/50">
                Km cumulés par mois
              </span>
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-violet-300/60">
              6 derniers mois
            </span>
          </div>

          <div className="flex h-[130px] items-end gap-3 pt-4">
            {buckets.map((b, i) => {
              const heightPct = Math.max(8, (b.km / maxKm) * 100);
              return (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2 group">
                  <span className="text-[10px] font-black text-violet-700 dark:text-violet-300 transition-opacity duration-200">
                    {Math.round(b.km)} km
                  </span>
                  <div className="relative flex h-full w-full max-w-[32px] items-end justify-center rounded-xl bg-neutral-100 p-1 dark:bg-white/[0.04]">
                    <div
                      className="w-full rounded-lg bg-gradient-to-t from-sps-violet600 via-[#8B5CF6] to-[#AA26FF] shadow-sm shadow-violet-600/30 transition-all duration-500"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-600 dark:text-white/50">
                    {b.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pelotons Distribution */}
      <section className="px-5">
        <div className="rounded-[28px] border border-neutral-200/90 bg-white p-5 shadow-xs transition dark:border-white/10 dark:bg-[#130B22]/80">
          <h2 className="mb-4 font-display text-xl uppercase tracking-wide text-neutral-950 dark:text-white font-black">
            Répartition par groupe
          </h2>

          {totalGroupCounts === 0 ? (
            <p className="py-2 text-center text-sm text-neutral-400 dark:text-white/40">Pas encore d&apos;inscriptions.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {(["vert", "rouge", "violet"] as GroupLevel[]).map((g) => {
                const count = groupCounts[g];
                const pct = Math.round((count / totalGroupCounts) * 100);
                return (
                  <div key={g} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                        <span
                          className="h-2.5 w-2.5 rounded-full shadow-xs"
                          style={{ color: GROUP_INFO[g].hex, backgroundColor: GROUP_INFO[g].hex }}
                        />
                        {GROUP_INFO[g].label}
                      </span>
                      <span className="font-extrabold text-neutral-600 dark:text-white/70">
                        {pct}% · {count} participation{count > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100 p-0.5 dark:bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${count > 0 ? Math.max(3, pct) : 0}%`,
                          backgroundColor: GROUP_INFO[g].hex,
                          boxShadow: `0 0 10px ${GROUP_INFO[g].hex}80`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Club Records */}
      <section className="px-5">
        <div className="rounded-[28px] border border-neutral-200/90 bg-white p-5 shadow-xs transition dark:border-white/10 dark:bg-[#130B22]/80">
          <h2 className="mb-3 font-display text-xl uppercase tracking-wide text-neutral-950 dark:text-white font-black">
            Records du club
          </h2>

          {!longestRide || !hilliestRide || !mostAttendedRide ? (
            <p className="p-4 text-center text-sm text-neutral-400 dark:text-white/40">Aucune sortie proposée pour le moment.</p>
          ) : (
            <div className="flex flex-col divide-y divide-neutral-200/80 dark:divide-white/[0.06]">
              <RecordRow
                icon="route"
                label="Sortie la plus longue"
                ride={longestRide}
                value={fmtKm(longestRide.distance_km)}
                color="#AA26FF"
              />
              <RecordRow
                icon="mountain"
                label="Plus gros dénivelé"
                ride={hilliestRide}
                value={fmtM(hilliestRide.elevation_gain_m)}
                color="#8B5CF6"
              />
              <RecordRow
                icon="members"
                label="Sortie la plus suivie"
                ride={mostAttendedRide}
                value={`${mostAttendedCount} participants`}
                color="#34D399"
              />
            </div>
          )}
        </div>
      </section>

      {/* Rides by year */}
      <section className="px-5">
        <div className="rounded-[28px] border border-neutral-200/90 bg-white p-5 shadow-xs transition dark:border-white/10 dark:bg-[#130B22]/80">
          <h2 className="mb-3 font-display text-xl uppercase tracking-wide text-neutral-950 dark:text-white font-black">
            Sorties par année
          </h2>

          {yearRows.length === 0 ? (
            <p className="p-4 text-center text-sm text-neutral-400 dark:text-white/40">Aucune sortie proposée pour le moment.</p>
          ) : (
            <div className="flex flex-col divide-y divide-neutral-200/80 dark:divide-white/[0.06]">
              {yearRows.map(([year, count]) => (
                <div key={year} className="flex items-center gap-3 py-3 first:pt-1 last:pb-1">
                  <span className="w-12 font-display text-base font-black text-neutral-950 dark:text-white">{year}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sps-violet600 to-[#AA26FF]"
                      style={{ width: `${Math.max(6, (count / maxYearCount) * 100)}%` }}
                    />
                  </div>
                  <span className="w-24 text-right text-xs font-bold text-neutral-600 dark:text-white/60">
                    {count} sortie{count > 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Assiduity Ranking (Admin only section inside) */}
      <section>
        <MemberAssiduityRanking ranking={assiduityRanking} />
      </section>
    </div>
  );
}

function StatBento({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-neutral-200/90 bg-white px-2.5 py-2.5 text-center shadow-xs transition dark:border-white/10 dark:bg-[#130B22]/80">
      {accent && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-3 -top-3 h-8 w-8 rounded-full opacity-15 blur-md dark:opacity-25"
          style={{ backgroundColor: accent }}
        />
      )}
      <span className="block font-display text-[17px] sm:text-[19px] font-black leading-tight text-neutral-950 dark:text-white">
        {value}
      </span>
      <span className="mt-0.5 block text-[9.5px] font-bold uppercase leading-tight tracking-wider text-neutral-500 dark:text-violet-300/70">
        {label}
      </span>
    </div>
  );
}

function RecordRow({
  icon,
  label,
  ride,
  value,
  color,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  ride: Ride;
  value: string;
  color: string;
}) {
  return (
    <Link
      href={`/v2/rides/${ride.id}`}
      prefetch={true}
      className="group flex items-center gap-3 py-3.5 transition hover:opacity-90"
    >
      <span
        className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-neutral-100 text-neutral-900 shadow-xs transition group-hover:scale-105 dark:bg-white/[0.06] dark:text-white"
        style={{ color }}
      >
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 dark:text-violet-300/60">
          {label}
        </span>
        <span className="block truncate text-sm font-black text-neutral-950 transition-colors group-hover:text-violet-700 dark:text-white dark:group-hover:text-violet-200">
          {ride.title}
        </span>
      </div>
      <span className="flex-none text-right font-display text-lg font-black text-neutral-950 dark:text-white">
        {value}
      </span>
    </Link>
  );
}
