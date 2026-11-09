"use client";

import { useMemo, useState } from "react";
import { AdminOnly } from "./AdminOnly";
import { Avatar } from "./Avatar";
import { Icon } from "./Icons";
import {
  computeMonthlyStats,
  formatReactionTime,
  getAvailableMonths,
  type MonthlyMemberStats,
} from "@/lib/monthlyStats";
import { GROUP_INFO, type GroupLevel, type Participation, type Ride } from "@/lib/types";
import { fmtKm, fmtM } from "@/lib/format";

interface MonthlyStatsSectionProps {
  rides: Ride[];
  participations: Participation[];
}

export function MonthlyStatsSection({ rides, participations }: MonthlyStatsSectionProps) {
  const months = useMemo(() => getAvailableMonths(rides), [rides]);
  const [selectedMonth, setSelectedMonth] = useState<string>(months[0]?.key || "");
  const [showTop10, setShowTop10] = useState(false);

  const stats = useMemo(() => {
    return computeMonthlyStats(rides, participations, selectedMonth);
  }, [rides, participations, selectedMonth]);

  if (!months || months.length === 0) return null;

  const topAttendanceLeader = stats.topAttendance[0];
  const topElevationLeader = stats.topElevation[0];
  const topDistanceLeader = stats.topDistance[0];
  const mostReactiveLeader = stats.mostReactive[0];
  const topLeaderLeader = stats.topLeaders[0];

  const hasData = stats.totalParticipationsInMonth > 0 || stats.totalRidesInMonth > 0;

  return (
    <AdminOnly>
      <section className="px-5">
        <div className="overflow-hidden rounded-[28px] border border-neutral-200/90 bg-white shadow-xs transition dark:border-white/10 dark:bg-[#130B22]/90">
          {/* Header avec Titre + Badge Admin + Sélecteur de mois */}
          <div className="border-b border-neutral-100 p-5 dark:border-white/[0.08]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sps-violet600 to-fuchsia-500 text-white shadow-md shadow-sps-violet600/25">
                  <Icon name="trophy" size={18} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl uppercase tracking-wide text-neutral-950 dark:text-white font-black">
                      Trophées du mois
                    </h2>
                    <span className="rounded-full border border-sps-violet600/30 bg-sps-violet600/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-sps-violet600 dark:border-sps-violet400/30 dark:bg-sps-violet400/10 dark:text-sps-violet300">
                      Admin Only
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-neutral-500 dark:text-white/50">
                    Performances & statistiques nominatives SPS
                  </p>
                </div>
              </div>

              {/* Sélecteur de mois */}
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="cursor-pointer appearance-none rounded-xl border border-neutral-200 bg-neutral-50 py-1.5 pl-3.5 pr-8 text-xs font-black text-neutral-900 outline-none transition focus:border-sps-violet500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                >
                  {months.map((m) => (
                    <option key={m.key} value={m.key} className="bg-white text-black dark:bg-[#1A1422] dark:text-white">
                      {m.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-white/40">
                  <Icon name="chevDown" size={13} />
                </span>
              </div>
            </div>

            {/* Chiffres collectifs du mois en micro-bento */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-2.5 text-center dark:border-white/[0.06] dark:bg-white/[0.03]">
                <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-white/40">
                  Sorties
                </span>
                <span className="font-display text-base font-black text-neutral-900 dark:text-white">
                  {stats.totalRidesInMonth}
                </span>
              </div>
              <div className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-2.5 text-center dark:border-white/[0.06] dark:bg-white/[0.03]">
                <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-white/40">
                  Inscriptions
                </span>
                <span className="font-display text-base font-black text-sps-violet600 dark:text-sps-violet400">
                  {stats.totalParticipationsInMonth}
                </span>
              </div>
              <div className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-2.5 text-center dark:border-white/[0.06] dark:bg-white/[0.03]">
                <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-white/40">
                  Cumul Km
                </span>
                <span className="font-display text-base font-black text-neutral-900 dark:text-white">
                  {fmtKm(stats.totalKmInMonth)}
                </span>
              </div>
              <div className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-2.5 text-center dark:border-white/[0.06] dark:bg-white/[0.03]">
                <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-white/40">
                  Cumul D+
                </span>
                <span className="font-display text-base font-black text-neutral-900 dark:text-white">
                  {fmtM(stats.totalElevationInMonth)}
                </span>
              </div>
            </div>
          </div>

          {!hasData ? (
            <div className="p-8 text-center text-sm font-semibold text-neutral-400 dark:text-white/40">
              Aucune sortie ni participation enregistrée pour {stats.monthLabel}.
            </div>
          ) : (
            <div className="p-5 flex flex-col gap-5">
              {/* Les 4 Trophées Phares */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* 1. Assiduité du mois + TOP 10 */}
                <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                          🥇
                        </span>
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                            Plus Assidu du mois
                          </h3>
                          <span className="text-[10px] font-semibold text-neutral-400 dark:text-white/40">
                            Membre le plus présent
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-amber-500">#1 Top Assiduité</span>
                    </div>

                    {topAttendanceLeader ? (
                      <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3">
                        <Avatar name={topAttendanceLeader.display} seed={topAttendanceLeader.display} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-display text-base font-black text-neutral-950 dark:text-white">
                              {topAttendanceLeader.display}
                            </span>
                            <GroupPills groups={topAttendanceLeader.groups} />
                          </div>
                          <span className="text-[11px] font-medium text-neutral-500 dark:text-white/50">
                            {topAttendanceLeader.totalKm} km parcourus · {fmtM(topAttendanceLeader.totalElevation)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-display text-lg font-black text-amber-600 dark:text-amber-400">
                            {topAttendanceLeader.ridesCount}
                          </span>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-white/40">
                            sorties
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400">Aucune donnée</p>
                    )}
                  </div>

                  {/* Bouton Top 10 Déroulable */}
                  {stats.topAttendance.length > 1 && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setShowTop10((v) => !v)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white py-2 text-xs font-bold text-neutral-800 transition hover:bg-neutral-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.08]"
                      >
                        <span>{showTop10 ? "Masquer le TOP 10" : `Voir le TOP 10 du mois (${stats.topAttendance.length})`}</span>
                        <Icon name="chevDown" size={13} className={showTop10 ? "rotate-180" : ""} />
                      </button>

                      {showTop10 && (
                        <div className="mt-2.5 flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200/60 bg-white p-1 dark:divide-white/[0.05] dark:border-white/10 dark:bg-[#1A1422]">
                          {stats.topAttendance.map((m, idx) => (
                            <div key={m.display} className="flex items-center gap-2.5 px-3 py-2 text-xs">
                              <span
                                className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-black ${
                                  idx === 0
                                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-300"
                                    : idx === 1
                                    ? "bg-slate-300/30 text-slate-700 dark:text-slate-200"
                                    : idx === 2
                                    ? "bg-amber-700/20 text-amber-800 dark:text-amber-400"
                                    : "bg-neutral-100 text-neutral-500 dark:bg-white/[0.05] dark:text-white/40"
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <Avatar name={m.display} seed={m.display} size="sm" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                  <span className="truncate font-bold text-neutral-900 dark:text-white">
                                    {m.display}
                                  </span>
                                  <GroupPills groups={m.groups} />
                                </div>
                              </div>
                              <span className="font-extrabold text-neutral-700 dark:text-white/80">
                                {m.ridesCount} sortie{m.ridesCount > 1 ? "s" : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Roi du D+ (Grimpeur du mois) */}
                <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                          ⛰️
                        </span>
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                            Grimpeur du mois
                          </h3>
                          <span className="text-[10px] font-semibold text-neutral-400 dark:text-white/40">
                            Plus gros cumul de dénivelé
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-500">Max D+</span>
                    </div>

                    {topElevationLeader ? (
                      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
                        <Avatar name={topElevationLeader.display} seed={topElevationLeader.display} size="md" />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate font-display text-base font-black text-neutral-950 dark:text-white">
                            {topElevationLeader.display}
                          </span>
                          <span className="text-[11px] font-medium text-neutral-500 dark:text-white/50">
                            {topElevationLeader.ridesCount} sortie{topElevationLeader.ridesCount > 1 ? "s" : ""} · {topElevationLeader.totalKm} km
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-display text-lg font-black text-emerald-600 dark:text-emerald-400">
                            {fmtM(topElevationLeader.totalElevation)}
                          </span>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-white/40">
                            D+ cumulé
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400">Aucune donnée</p>
                    )}
                  </div>

                  {/* Podium Grimpeurs (2e et 3e) */}
                  {stats.topElevation.length > 1 && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      {stats.topElevation.slice(1, 4).map((m, idx) => (
                        <div
                          key={m.display}
                          className="flex items-center justify-between rounded-xl bg-white px-3 py-1.5 text-xs border border-neutral-100 dark:border-white/[0.05] dark:bg-white/[0.02]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-black text-neutral-400">#{idx + 2}</span>
                            <span className="truncate font-semibold text-neutral-800 dark:text-white/80">
                              {m.display}
                            </span>
                          </div>
                          <span className="font-extrabold text-neutral-600 dark:text-white/60">
                            {fmtM(m.totalElevation)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Rouleur du mois (Plus de Km) */}
                <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                          🚴
                        </span>
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                            Rouleur du mois
                          </h3>
                          <span className="text-[10px] font-semibold text-neutral-400 dark:text-white/40">
                            Plus grande distance cumulée
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-blue-500">Max Km</span>
                    </div>

                    {topDistanceLeader ? (
                      <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-3">
                        <Avatar name={topDistanceLeader.display} seed={topDistanceLeader.display} size="md" />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate font-display text-base font-black text-neutral-950 dark:text-white">
                            {topDistanceLeader.display}
                          </span>
                          <span className="text-[11px] font-medium text-neutral-500 dark:text-white/50">
                            {topDistanceLeader.ridesCount} sortie{topDistanceLeader.ridesCount > 1 ? "s" : ""} · {fmtM(topDistanceLeader.totalElevation)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-display text-lg font-black text-blue-600 dark:text-blue-400">
                            {topDistanceLeader.totalKm}
                          </span>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-white/40">
                            km
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400">Aucune donnée</p>
                    )}
                  </div>

                  {/* Podium Rouleurs (2e et 3e) */}
                  {stats.topDistance.length > 1 && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      {stats.topDistance.slice(1, 4).map((m, idx) => (
                        <div
                          key={m.display}
                          className="flex items-center justify-between rounded-xl bg-white px-3 py-1.5 text-xs border border-neutral-100 dark:border-white/[0.05] dark:bg-white/[0.02]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-black text-neutral-400">#{idx + 2}</span>
                            <span className="truncate font-semibold text-neutral-800 dark:text-white/80">
                              {m.display}
                            </span>
                          </div>
                          <span className="font-extrabold text-neutral-600 dark:text-white/60">
                            {m.totalKm} km
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Le Plus Réactif (Gâchette la plus rapide) */}
                <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-500">
                          ⚡
                        </span>
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                            Le Plus Réactif
                          </h3>
                          <span className="text-[10px] font-semibold text-neutral-400 dark:text-white/40">
                            Inscription la plus rapide
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-yellow-500">Délai express</span>
                    </div>

                    {mostReactiveLeader ? (
                      <div className="flex items-center gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/[0.04] p-3">
                        <Avatar name={mostReactiveLeader.display} seed={mostReactiveLeader.display} size="md" />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate font-display text-base font-black text-neutral-950 dark:text-white">
                            {mostReactiveLeader.display}
                          </span>
                          <span className="text-[11px] font-medium text-neutral-500 dark:text-white/50">
                            Record : {formatReactionTime(mostReactiveLeader.fastestReactionMinutes)} après publication
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-display text-base font-black text-yellow-600 dark:text-yellow-400">
                            {formatReactionTime(mostReactiveLeader.avgReactionMinutes)}
                          </span>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-white/40">
                            délai moy.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400">Aucune donnée d&apos;inscription horodatée</p>
                    )}
                  </div>

                  {/* Podium Réactifs (2e et 3e) */}
                  {stats.mostReactive.length > 1 && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      {stats.mostReactive.slice(1, 4).map((m, idx) => (
                        <div
                          key={m.display}
                          className="flex items-center justify-between rounded-xl bg-white px-3 py-1.5 text-xs border border-neutral-100 dark:border-white/[0.05] dark:bg-white/[0.02]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-black text-neutral-400">#{idx + 2}</span>
                            <span className="truncate font-semibold text-neutral-800 dark:text-white/80">
                              {m.display}
                            </span>
                          </div>
                          <span className="font-extrabold text-neutral-600 dark:text-white/60">
                            {formatReactionTime(m.avgReactionMinutes)} moy.
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Idées complémentaires : Grand Chelem 100% & Leader du mois */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Grand Chelem (100% de présence) */}
                <div className="flex flex-col justify-between rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.05] to-fuchsia-500/[0.03] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎯</span>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                          Grand Chelem du mois
                        </h4>
                        <span className="text-[10px] font-semibold text-neutral-400 dark:text-white/40">
                          100% de présence sur toutes les sorties
                        </span>
                      </div>
                    </div>
                    <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-black text-violet-600 dark:text-violet-300">
                      {stats.totalRidesInMonth} / {stats.totalRidesInMonth}
                    </span>
                  </div>

                  {stats.perfectAttendanceMembers.length > 0 ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {stats.perfectAttendanceMembers.map((m) => (
                        <div
                          key={m.display}
                          className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-white/80 px-2.5 py-1.5 shadow-xs dark:bg-white/[0.06]"
                        >
                          <Avatar name={m.display} seed={m.display} size="sm" />
                          <span className="text-xs font-bold text-neutral-900 dark:text-white">
                            {m.display}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-neutral-500 dark:text-white/50">
                      {stats.totalRidesInMonth < 2
                        ? "Nécessite au moins 2 sorties dans le mois."
                        : "Aucun membre n'a encore réalisé le sans-faute ce mois-ci."}
                    </p>
                  )}
                </div>

                {/* Leader du mois */}
                <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🧭</span>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                          Leader du mois
                        </h4>
                        <span className="text-[10px] font-semibold text-neutral-400 dark:text-white/40">
                          Membre ayant le plus guidé de sorties
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-sps-violet600 dark:text-sps-violet400">
                      Groupe Leader
                    </span>
                  </div>

                  {topLeaderLeader ? (
                    <div className="mt-2 flex items-center justify-between rounded-xl bg-white p-2.5 border border-neutral-100 dark:border-white/[0.05] dark:bg-white/[0.02]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={topLeaderLeader.display} seed={topLeaderLeader.display} size="sm" />
                        <span className="truncate text-xs font-bold text-neutral-900 dark:text-white">
                          {topLeaderLeader.display}
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-sps-violet600 dark:text-sps-violet400">
                        {topLeaderLeader.leaderCount} fois leader
                      </span>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-neutral-400">
                      Aucun Leader désigné ce mois-ci.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </AdminOnly>
  );
}

function GroupPills({ groups }: { groups: Record<GroupLevel, number> }) {
  if (!groups || (groups.vert === 0 && groups.rouge === 0 && groups.violet === 0)) return null;

  return (
    <span className="flex items-center gap-1 text-[11px] font-black tracking-tight">
      {groups.vert > 0 && (
        <span className="text-emerald-600 dark:text-emerald-400" title={`${groups.vert} en Vert`}>
          ({groups.vert})
        </span>
      )}
      {groups.rouge > 0 && (
        <span className="text-red-600 dark:text-red-400" title={`${groups.rouge} en Rouge`}>
          ({groups.rouge})
        </span>
      )}
      {groups.violet > 0 && (
        <span className="text-[#AA26FF] dark:text-[#C084FC]" title={`${groups.violet} en Violet`}>
          ({groups.violet})
        </span>
      )}
    </span>
  );
}
