import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/publicClient";
import { fetchAllParticipations, fetchRides } from "@/lib/queries";
import { Icon } from "@/components/Icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MemberAssiduityRanking } from "@/components/MemberAssiduityRanking";
import { MonthlyStatsSection } from "@/components/MonthlyStatsSection";
import { buildAssiduityRankingFromParticipations, normalizeMemberName } from "@/lib/assiduity";
import { fmtKm, fmtM, isPastDate } from "@/lib/format";
import { GROUP_INFO, type GroupLevel, type Ride } from "@/lib/types";
import { detectRideGroup } from "@/lib/rideGroup";

// Page volontairement collective : aucun classement nominatif des membres,
// uniquement des chiffres qui mettent en avant le club dans son ensemble.
// 100% publique (aucune donnee liee a une session, voir
// lib/supabase/publicClient.ts), mais rendue a chaque requete plutot que
// mise en cache : voir la meme note sur app/(shell)/home/page.tsx.
export const dynamic = "force-dynamic";

export default async function ClassementPage() {
  const supabase = createPublicClient();
  const [rides, participations] = await Promise.all([fetchRides(supabase), fetchAllParticipations(supabase)]);

  const ridesById = new Map(rides.map((r) => [r.id, r]));
  const past = participations
    .map((p) => ({ ...p, ride: ridesById.get(p.ride_id) }))
    .filter((p) => p.ride && isPastDate(p.ride.ride_date));

  // Km et D+ cumules parcourus par l'ensemble des membres : chaque
  // inscription a une sortie passee ajoute la distance / le denivele de
  // cette sortie au total (une sortie avec 8 participants compte 8 fois).
  const totalKm = past.reduce((sum, p) => sum + (p.ride?.distance_km || 0), 0);
  const totalElevation = past.reduce((sum, p) => sum + (p.ride?.elevation_gain_m || 0), 0);
  const totalRidesOrganized = rides.length;

  // Participation moyenne par sortie proposee (toutes les sorties, passees
  // et a venir, inscriptions en cours comprises).
  const avgParticipants = totalRidesOrganized > 0 ? participations.length / totalRidesOrganized : 0;

  // Repartition des inscriptions par groupe de niveau (toutes les sorties) :
  // donne le profil du club, jamais un classement de membres.
  const groupCounts: Record<GroupLevel, number> = { vert: 0, rouge: 0, violet: 0 };
  participations.forEach((p) => groupCounts[p.group_level]++);
  const totalGroupCounts = participations.length;

  // Statistiques de participants uniques par groupe de niveau
  const uniqueParticipantsByGroup: Record<GroupLevel, number> = {
    vert: new Set(participations.filter((p) => p.group_level === "vert").map((p) => normalizeMemberName(p.participant_name))).size,
    rouge: new Set(participations.filter((p) => p.group_level === "rouge").map((p) => normalizeMemberName(p.participant_name))).size,
    violet: new Set(participations.filter((p) => p.group_level === "violet").map((p) => normalizeMemberName(p.participant_name))).size,
  };
  const totalUniqueParticipants = new Set(
    participations.map((p) => normalizeMemberName(p.participant_name))
  ).size;

  // Nombre de sorties ayant proposé chaque groupe
  const ridesOfferingGroup: Record<GroupLevel, number> = { vert: 0, rouge: 0, violet: 0 };
  rides.forEach((r) => {
    const list = (r.ride_groups || []).map((g) => g.group_level);
    (["vert", "rouge", "violet"] as GroupLevel[]).forEach((g) => {
      if (list.includes(g)) ridesOfferingGroup[g]++;
    });
  });
  const avgParticipantsByGroup: Record<GroupLevel, number> = {
    vert: ridesOfferingGroup.vert > 0 ? groupCounts.vert / ridesOfferingGroup.vert : 0,
    rouge: ridesOfferingGroup.rouge > 0 ? groupCounts.rouge / ridesOfferingGroup.rouge : 0,
    violet: ridesOfferingGroup.violet > 0 ? groupCounts.violet / ridesOfferingGroup.violet : 0,
  };

  // Records du club : sortie la plus longue, plus gros denivele, la plus
  // suivie — des records de sorties, jamais de membres.
  const participantCountByRide = new Map<string, number>();
  participations.forEach((p) => participantCountByRide.set(p.ride_id, (participantCountByRide.get(p.ride_id) || 0) + 1));
  const longestRide = rides.reduce<Ride | null>((max, r) => (!max || r.distance_km > max.distance_km ? r : max), null);
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

  // Sorties proposees par le club, par annee et par groupe de niveau
  interface YearStats {
    total: number;
    vert: number;
    rouge: number;
    violet: number;
  }
  const perYear = new Map<number, YearStats>();
  rides.forEach((r) => {
    const year = Number(r.ride_date.slice(0, 4));
    if (!Number.isNaN(year)) {
      if (!perYear.has(year)) {
        perYear.set(year, { total: 0, vert: 0, rouge: 0, violet: 0 });
      }
      const entry = perYear.get(year)!;
      entry.total++;
      let effective = (r.ride_groups || []).map((g) => g.group_level);
      if (effective.length === 0) {
        const detected = detectRideGroup(r);
        if (detected) effective = [detected];
      }
      if (effective.includes("vert")) entry.vert++;
      if (effective.includes("rouge")) entry.rouge++;
      if (effective.includes("violet")) entry.violet++;
    }
  });
  const yearRows = Array.from(perYear.entries()).sort((a, b) => b[0] - a[0]);
  const maxYearTotal = Math.max(...yearRows.map(([, s]) => s.total), 1);

  // Activite club (km cumules, tous participants, 6 derniers mois)
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

  // Classement nominatif des membres les plus assidus (sorties passees) :
  // volontairement absent des chiffres publics ci-dessus (voir le
  // commentaire en tete de fichier), calcule ici uniquement pour l'affichage
  // reserve aux admins (voir MemberAssiduityRanking). Les participations
  // n'etant pas liees a un compte, un "membre" est identifie par son nom,
  // regroupe en ignorant casse/espaces/accents/ordre nom-prenom (ex.
  // "Thomas Trégaro" et "Tregaro Thomas" comptent pour la meme personne) —
  // voir lib/assiduity.ts. Classement complet ici : c'est
  // MemberAssiduityRanking qui n'affiche que les premiers, avec un bouton
  // "Afficher plus" pour derouler le reste.
  const assiduityRanking = buildAssiduityRankingFromParticipations(past);

  return (
    <div className="flex flex-col gap-6">
      {/* En-tete V1 */}
      <div className="flex items-center justify-between px-5 pb-1 pt-5">
        <div className="min-w-0 pr-2">
          <h1 className="font-display text-[26px] tracking-wide">Statistique SPS</h1>
          <p className="text-[12.5px] text-black/45 dark:text-white/45">Les chiffres du club, tous membres confondus.</p>
        </div>
        <div className="flex-shrink-0">
          <ThemeToggle />
        </div>
      </div>

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

      {/* Pelotons Distribution & Participants par groupe */}
      <section className="px-5">
        <div className="rounded-[28px] border border-neutral-200/90 bg-white p-5 shadow-xs transition dark:border-white/10 dark:bg-[#130B22]/80">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl uppercase tracking-wide text-neutral-950 dark:text-white font-black">
                Participants par groupe
              </h2>
              <span className="text-[11px] font-semibold text-neutral-500 dark:text-white/50">
                Membres uniques et moyennes par allure
              </span>
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-violet-300/60">
              {totalUniqueParticipants} membres uniques
            </span>
          </div>

          {/* 3 Cartes Bento pour les participants uniques par groupe */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            {(["vert", "rouge", "violet"] as GroupLevel[]).map((g) => {
              const info = GROUP_INFO[g];
              const uniqueCount = uniqueParticipantsByGroup[g];
              const avg = avgParticipantsByGroup[g];
              return (
                <div
                  key={g}
                  className="relative flex flex-col items-center justify-between overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-3 text-center dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-10 dark:opacity-20"
                    style={{ background: `radial-gradient(circle at top, ${info.hex}, transparent 70%)` }}
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: info.hex }} />
                    <span className="text-[11.5px] font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                      {info.label}
                    </span>
                  </div>

                  <div className="my-1.5">
                    <span className="font-display text-2xl font-black text-neutral-950 dark:text-white">
                      {uniqueCount}
                    </span>
                    <span className="block text-[9.5px] font-bold uppercase tracking-wider text-neutral-400 dark:text-white/40">
                      participants
                    </span>
                  </div>

                  <div className="border-t border-black/[0.06] pt-1.5 w-full dark:border-white/[0.08] text-[10.5px] font-extrabold text-neutral-500 dark:text-white/60">
                    <span>~{avg > 0 ? avg.toFixed(1).replace(".", ",") : "0"} / sortie</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Volume total des participations */}
          <div className="border-t border-neutral-100 pt-4 dark:border-white/[0.06]">
            <h3 className="mb-3 text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-violet-300/70">
              Volume total des participations ({totalGroupCounts})
            </h3>
            {totalGroupCounts === 0 ? (
              <p className="py-2 text-center text-sm text-neutral-400 dark:text-white/40">Pas encore d&apos;inscriptions.</p>
            ) : (
              <div className="flex flex-col gap-3.5">
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
                      <div className="h-2 overflow-hidden rounded-full bg-neutral-100 p-0.5 dark:bg-white/[0.06]">
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
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl uppercase tracking-wide text-neutral-950 dark:text-white font-black">
                Sorties par année
              </h2>
              <span className="text-[11px] font-semibold text-neutral-500 dark:text-white/50">
                Historique des sorties proposées par groupe de niveau
              </span>
            </div>
          </div>

          {yearRows.length === 0 ? (
            <p className="p-4 text-center text-sm text-neutral-400 dark:text-white/40">Aucune sortie proposée pour le moment.</p>
          ) : (
            <div className="flex flex-col divide-y divide-neutral-200/80 dark:divide-white/[0.06]">
              {yearRows.map(([year, stats]) => {
                const sumGroups = stats.vert + stats.rouge + stats.violet;
                return (
                  <div key={year} className="flex flex-col gap-2.5 py-4 first:pt-1 last:pb-1">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-lg font-black text-neutral-950 dark:text-white">{year}</span>
                      <span className="text-xs font-black text-neutral-700 dark:text-white/80">
                        {stats.total} sortie{stats.total > 1 ? "s" : ""} au total
                      </span>
                    </div>

                    {/* Barre segmentée aux couleurs des groupes */}
                    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 p-0.5 dark:bg-white/[0.06]">
                      <div
                        className="flex h-full overflow-hidden rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(8, (stats.total / maxYearTotal) * 100)}%` }}
                      >
                        {sumGroups > 0 ? (
                          <>
                            {stats.vert > 0 && (
                              <div
                                style={{
                                  width: `${(stats.vert / sumGroups) * 100}%`,
                                  backgroundColor: GROUP_INFO.vert.hex,
                                }}
                                title={`Vert : ${stats.vert} sorties`}
                              />
                            )}
                            {stats.rouge > 0 && (
                              <div
                                style={{
                                  width: `${(stats.rouge / sumGroups) * 100}%`,
                                  backgroundColor: GROUP_INFO.rouge.hex,
                                }}
                                title={`Rouge : ${stats.rouge} sorties`}
                              />
                            )}
                            {stats.violet > 0 && (
                              <div
                                style={{
                                  width: `${(stats.violet / sumGroups) * 100}%`,
                                  backgroundColor: GROUP_INFO.violet.hex,
                                }}
                                title={`Violet : ${stats.violet} sorties`}
                              />
                            )}
                          </>
                        ) : (
                          <div className="w-full bg-gradient-to-r from-sps-violet600 to-[#AA26FF]" />
                        )}
                      </div>
                    </div>

                    {/* Détail par groupe de niveau pour l'année */}
                    <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs font-bold text-neutral-600 dark:text-white/70">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: GROUP_INFO.vert.hex }} />
                        <span>
                          {stats.vert} <strong className="font-extrabold text-neutral-900 dark:text-white">Vert</strong>
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: GROUP_INFO.rouge.hex }} />
                        <span>
                          {stats.rouge} <strong className="font-extrabold text-neutral-900 dark:text-white">Rouge</strong>
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: GROUP_INFO.violet.hex }} />
                        <span>
                          {stats.violet} <strong className="font-extrabold text-neutral-900 dark:text-white">Violet</strong>
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Trophées & Statistiques du mois (Réservé aux admins) */}
      <MonthlyStatsSection rides={rides} participations={participations} />

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
    <div className="relative isolate flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-neutral-200/90 bg-white px-2.5 py-2.5 text-center shadow-xs transition dark:border-white/10 dark:bg-[#130B22]/80">
      {accent && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-15 dark:opacity-25"
          style={{ background: `radial-gradient(circle at top right, ${accent}, transparent 65%)` }}
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
      href={`/rides/${ride.id}`}
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
