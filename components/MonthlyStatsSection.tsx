"use client";

import { useMemo, useState } from "react";
import { AdminOnly } from "./AdminOnly";
import { Avatar } from "./Avatar";
import { Icon } from "./Icons";
import {
  computeMonthlyStats,
  formatMonthLabel,
  getAvailableMonths,
} from "@/lib/monthlyStats";
import { type GroupLevel, type Participation, type Ride } from "@/lib/types";
import { fmtKm, fmtM } from "@/lib/format";
import type { StravaDataStore } from "@/lib/stravaScraper";

interface MonthlyStatsSectionProps {
  rides: Ride[];
  participations: Participation[];
  stravaData?: StravaDataStore | null;
}

export function MonthlyStatsSection({ rides, participations, stravaData }: MonthlyStatsSectionProps) {
  // Fusionne les mois disponibles des sorties app et les mois présents dans Strava
  const months = useMemo(() => {
    const baseMonths = getAvailableMonths(rides);
    const existingKeys = new Set(baseMonths.map((m) => m.key));

    if (stravaData?.monthlyLeaders) {
      for (const key of Object.keys(stravaData.monthlyLeaders)) {
        if (!existingKeys.has(key)) {
          baseMonths.push({ key, label: formatMonthLabel(key) });
          existingKeys.add(key);
        }
      }
    }

    return baseMonths.sort((a, b) => b.key.localeCompare(a.key));
  }, [rides, stravaData]);

  const [selectedMonth, setSelectedMonth] = useState<string>(months[0]?.key || "2026-11");
  const [showTop10, setShowTop10] = useState(false);
  const [showElevationTop10, setShowElevationTop10] = useState(false);
  const [showDistanceTop10, setShowDistanceTop10] = useState(false);

  // Statistiques calculées depuis l'app SPS (pour le Plus Assidu et les chiffres de participations sorties)
  const stats = useMemo(() => {
    return computeMonthlyStats(rides, participations, selectedMonth);
  }, [rides, participations, selectedMonth]);

  // Données Strava pour le mois calendaire sélectionné
  const stravaMonthLeaders = stravaData?.monthlyLeaders?.[selectedMonth];
  const hasStravaMonthData =
    !!stravaMonthLeaders &&
    (stravaMonthLeaders.topDistance.length > 0 || stravaMonthLeaders.topElevation.length > 0);

  // 1. Plus assidu du mois : RESTE STRICTEMENT BASÉ SUR L'APP SPS
  const maxRides = stats.topAttendance[0]?.ridesCount || 0;
  const topAttendanceLeaders = useMemo(() => {
    if (maxRides <= 0) return [];
    return stats.topAttendance.filter((m) => m.ridesCount === maxRides);
  }, [stats.topAttendance, maxRides]);

  const isAttendanceTie = topAttendanceLeaders.length > 1;

  // Calcul des rangs avec ex æquo pour le TOP 10 Assiduité (App SPS)
  const rankedTopAttendance = useMemo(() => {
    let rank = 1;
    return stats.topAttendance.map((m, idx, arr) => {
      if (idx > 0 && m.ridesCount < arr[idx - 1].ridesCount) {
        rank = idx + 1;
      }
      return { ...m, rank };
    });
  }, [stats.topAttendance]);

  // 2. Maillot à pois du mois (TOP 10 D+) : Strava si dispo, sinon fallback App SPS
  const top10Elevation = useMemo(() => {
    if (hasStravaMonthData && stravaMonthLeaders?.topElevation) {
      return stravaMonthLeaders.topElevation
        .filter((m) => m.elev_gain_m > 0)
        .slice(0, 10)
        .map((m, idx) => ({
          rank: idx + 1,
          display: m.officialName,
          ridesCount: m.activities,
          totalElevation: m.elev_gain_m,
          isStrava: true,
        }));
    }
    return stats.topElevation.slice(0, 10).map((m, idx) => ({
      rank: idx + 1,
      display: m.display,
      ridesCount: m.ridesCount,
      totalElevation: m.totalElevation,
      isStrava: false,
    }));
  }, [hasStravaMonthData, stravaMonthLeaders, stats.topElevation]);

  const topElevationLeader = top10Elevation[0] || null;

  // 3. Rouleur du mois (TOP 10 Km) : Strava si dispo, sinon fallback App SPS
  const top10Distance = useMemo(() => {
    if (hasStravaMonthData && stravaMonthLeaders?.topDistance) {
      return stravaMonthLeaders.topDistance
        .filter((m) => m.distance_km > 0)
        .slice(0, 10)
        .map((m, idx) => ({
          rank: idx + 1,
          display: m.officialName,
          ridesCount: m.activities,
          totalKm: m.distance_km,
          isStrava: true,
        }));
    }
    return stats.topDistance.slice(0, 10).map((m, idx) => ({
      rank: idx + 1,
      display: m.display,
      ridesCount: m.ridesCount,
      totalKm: m.totalKm,
      isStrava: false,
    }));
  }, [hasStravaMonthData, stravaMonthLeaders, stats.topDistance]);

  const topDistanceLeader = top10Distance[0] || null;

  if (!months || months.length === 0) return null;

  const hasData =
    stats.totalParticipationsInMonth > 0 ||
    stats.totalRidesInMonth > 0 ||
    hasStravaMonthData;

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
                    Maillot à pois & Rouleur synchronisés Strava · Assiduité SPS
                  </p>
                </div>
              </div>

              {/* Contrôles : Sélecteur de mois */}
              <div className="flex items-center gap-2">
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
            </div>

            {/* Chiffres collectifs du mois */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="col-span-2 rounded-2xl border border-neutral-100 bg-neutral-50/80 p-3 text-center dark:border-white/[0.06] dark:bg-white/[0.03]">
                <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-white/40">
                  Sorties SPS officielles
                </span>
                <span className="font-display text-lg font-black text-neutral-900 dark:text-white">
                  {stats.totalRidesInMonth} sortie{stats.totalRidesInMonth > 1 ? "s" : ""}
                </span>
              </div>

              <div className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-2.5 text-center dark:border-white/[0.06] dark:bg-white/[0.03]">
                <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-white/40">
                  Membres actifs SPS
                </span>
                <div className="flex items-baseline justify-center gap-1 font-display text-base font-black text-emerald-600 dark:text-emerald-400">
                  <span>{stats.uniqueActiveMembersInMonth}</span>
                  <span className="text-xs font-bold text-neutral-400 dark:text-white/40">/ 100</span>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-2.5 text-center dark:border-white/[0.06] dark:bg-white/[0.03]">
                <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-white/40">
                  Inscriptions SPS
                </span>
                <span className="font-display text-base font-black text-sps-violet600 dark:text-sps-violet400">
                  {stats.totalParticipationsInMonth}
                </span>
              </div>

              <div className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-2.5 text-center dark:border-white/[0.06] dark:bg-white/[0.03]">
                <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-white/40">
                  Cumul Km {hasStravaMonthData ? "(Strava)" : "(SPS)"}
                </span>
                <span className="font-display text-base font-black text-neutral-900 dark:text-white">
                  {hasStravaMonthData && stravaMonthLeaders
                    ? `${stravaMonthLeaders.totalKm.toLocaleString("fr-FR")} km`
                    : fmtKm(stats.totalKmInMonth)}
                </span>
              </div>

              <div className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-2.5 text-center dark:border-white/[0.06] dark:bg-white/[0.03]">
                <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-white/40">
                  Cumul D+ {hasStravaMonthData ? "(Strava)" : "(SPS)"}
                </span>
                <span className="font-display text-base font-black text-neutral-900 dark:text-white">
                  {hasStravaMonthData && stravaMonthLeaders
                    ? `${stravaMonthLeaders.totalElevation.toLocaleString("fr-FR")} m`
                    : fmtM(stats.totalElevationInMonth)}
                </span>
              </div>
            </div>
          </div>

          {!hasData ? (
            <div className="p-8 text-center text-sm font-semibold text-neutral-400 dark:text-white/40">
              Aucune donnée enregistrée pour {formatMonthLabel(selectedMonth)}.
            </div>
          ) : (
            <div className="p-5 flex flex-col gap-4">
              {/* 1. Assiduité du mois (Full width) : 100% APP SPS */}
              <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div>
                  <div className="mb-3">
                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5 flex-1">
                        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-amber-500/10 text-xs">
                          🥇
                        </span>
                        <h3 className="truncate text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                          Plus Assidu du mois
                        </h3>
                        <span className="flex-none rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-600 dark:text-amber-400">
                          App SPS
                        </span>
                      </div>
                      <span className="flex-none whitespace-nowrap text-[11px] font-black text-amber-600 dark:text-amber-400">
                        {isAttendanceTie ? `${topAttendanceLeaders.length} ex æquo` : "#1 Sorties"}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] font-semibold text-neutral-400 dark:text-white/40">
                      Sorties club réalisées dans l&apos;application
                    </p>
                  </div>

                  {topAttendanceLeaders.length > 0 ? (
                    <div className="flex flex-col divide-y divide-amber-500/20 rounded-xl border border-amber-500/20 bg-amber-500/[0.04]">
                      {topAttendanceLeaders.map((leader) => (
                        <div key={leader.display} className="flex items-center gap-2.5 p-3 min-w-0">
                          <Avatar name={leader.display} seed={leader.display} size="md" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="truncate font-display text-sm sm:text-base font-black text-neutral-950 dark:text-white">
                                {leader.display}
                              </span>
                              <GroupPills groups={leader.groups} />
                            </div>
                            <span className="block truncate text-[11px] font-medium text-neutral-500 dark:text-white/50">
                              {leader.ridesCount} participation{leader.ridesCount > 1 ? "s" : ""} officielle{leader.ridesCount > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex-none text-right pl-2">
                            <span className="font-display text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                              {leader.ridesCount}
                            </span>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-white/40">
                              sortie{leader.ridesCount > 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400">Aucune participation club enregistrée</p>
                  )}
                </div>

                {/* Bouton Top 10 Déroulable (Sorties App SPS) */}
                {rankedTopAttendance.length > 1 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowTop10((v) => !v)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white py-2 text-xs font-bold text-neutral-800 transition hover:bg-neutral-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.08]"
                    >
                      <span>{showTop10 ? "Masquer le TOP 10" : `Voir le TOP 10 du mois (${rankedTopAttendance.length})`}</span>
                      <Icon name="chevDown" size={13} className={showTop10 ? "rotate-180 transition-transform" : "transition-transform"} />
                    </button>

                    {showTop10 && (
                      <div className="mt-2.5 flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200/60 bg-white p-1 dark:divide-white/[0.05] dark:border-white/10 dark:bg-[#1A1422]">
                        {rankedTopAttendance.map((m) => (
                          <div key={m.display} className="flex items-center gap-2.5 px-3 py-2 text-xs">
                            <span
                              className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-black ${
                                m.rank === 1
                                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-300"
                                  : m.rank === 2
                                  ? "bg-slate-300/30 text-slate-700 dark:text-slate-200"
                                  : m.rank === 3
                                  ? "bg-amber-700/20 text-amber-800 dark:text-amber-400"
                                  : "bg-neutral-100 text-neutral-500 dark:bg-white/[0.05] dark:text-white/40"
                              }`}
                            >
                              {m.rank}
                            </span>
                            <Avatar name={m.display} seed={m.display} size="sm" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="truncate font-bold text-neutral-900 dark:text-white">
                                  {m.display}
                                </span>
                                <GroupPills groups={m.groups} />
                              </div>
                            </div>
                            <span className="font-extrabold text-neutral-700 dark:text-white/80 whitespace-nowrap flex-none">
                              {m.ridesCount} sortie{m.ridesCount > 1 ? "s" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2 & 3. Maillot à pois (TOP 10 Strava D+) & Rouleur (TOP 10 Strava Km) côte à côte */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* 2. Maillot à pois du mois (TOP 10 Strava D+) */}
                <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div>
                    <div className="mb-3">
                      <div className="flex items-center justify-between gap-1.5 min-w-0">
                        <div className="flex min-w-0 items-center gap-1.5 flex-1">
                          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-rose-500/10 text-xs">
                            🔴
                          </span>
                          <h3 className="truncate text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                            Maillot à pois du mois
                          </h3>
                          {topElevationLeader?.isStrava && (
                            <span className="flex-none rounded-full bg-[#FC5200]/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#FC5200]">
                              Strava
                            </span>
                          )}
                        </div>
                        <span className="flex-none whitespace-nowrap text-[11px] font-black text-rose-600 dark:text-rose-400">
                          TOP 10 D+
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] font-semibold text-neutral-400 dark:text-white/40">
                        Top dénivelé positif cumulé du mois
                      </p>
                    </div>

                    {topElevationLeader ? (
                      <div className="flex items-center gap-3 rounded-xl border border-rose-500/25 bg-rose-500/[0.04] p-3">
                        <Avatar name={topElevationLeader.display} seed={topElevationLeader.display} size="md" />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate font-display text-base font-black text-neutral-950 dark:text-white">
                            {topElevationLeader.display}
                          </span>
                          <span className="text-[11px] font-medium text-neutral-500 dark:text-white/50">
                            {topElevationLeader.ridesCount} sortie{topElevationLeader.ridesCount > 1 ? "s" : ""} à vélo
                          </span>
                        </div>
                        <div className="text-right flex-none pl-2">
                          <span className="font-display text-lg font-black text-rose-600 dark:text-rose-400">
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

                  {/* Bouton Top 10 Déroulable D+ */}
                  {top10Elevation.length > 1 && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setShowElevationTop10((v) => !v)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white py-2 text-xs font-bold text-neutral-800 transition hover:bg-neutral-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.08]"
                      >
                        <span>{showElevationTop10 ? "Masquer le TOP 10" : `Voir le TOP 10 D+ (${top10Elevation.length})`}</span>
                        <Icon name="chevDown" size={13} className={showElevationTop10 ? "rotate-180 transition-transform" : "transition-transform"} />
                      </button>

                      {showElevationTop10 && (
                        <div className="mt-2.5 flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200/60 bg-white p-1 dark:divide-white/[0.05] dark:border-white/10 dark:bg-[#1A1422]">
                          {top10Elevation.map((m) => (
                            <div key={m.display} className="flex items-center gap-2.5 px-3 py-2 text-xs">
                              <span
                                className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-black ${
                                  m.rank === 1
                                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-300"
                                    : m.rank === 2
                                    ? "bg-slate-300/30 text-slate-700 dark:text-slate-200"
                                    : m.rank === 3
                                    ? "bg-amber-700/20 text-amber-800 dark:text-amber-400"
                                    : "bg-neutral-100 text-neutral-500 dark:bg-white/[0.05] dark:text-white/40"
                                }`}
                              >
                                {m.rank}
                              </span>
                              <Avatar name={m.display} seed={m.display} size="sm" />
                              <div className="min-w-0 flex-1">
                                <span className="truncate font-bold text-neutral-900 dark:text-white block">
                                  {m.display}
                                </span>
                                <span className="text-[10px] text-neutral-400 dark:text-white/40">
                                  {m.ridesCount} sortie{m.ridesCount > 1 ? "s" : ""}
                                </span>
                              </div>
                              <span className="font-extrabold text-rose-600 dark:text-rose-400 whitespace-nowrap flex-none">
                                {fmtM(m.totalElevation)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Rouleur du mois (TOP 10 Strava Km) */}
                <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div>
                    <div className="mb-3">
                      <div className="flex items-center justify-between gap-1.5 min-w-0">
                        <div className="flex min-w-0 items-center gap-1.5 flex-1">
                          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-blue-500/10 text-xs">
                            🚴
                          </span>
                          <h3 className="truncate text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                            Rouleur du mois
                          </h3>
                          {topDistanceLeader?.isStrava && (
                            <span className="flex-none rounded-full bg-[#FC5200]/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#FC5200]">
                              Strava
                            </span>
                          )}
                        </div>
                        <span className="flex-none whitespace-nowrap text-[11px] font-black text-blue-600 dark:text-blue-400">
                          TOP 10 Km
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] font-semibold text-neutral-400 dark:text-white/40">
                        Top distance cumulée du mois
                      </p>
                    </div>

                    {topDistanceLeader ? (
                      <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-3">
                        <Avatar name={topDistanceLeader.display} seed={topDistanceLeader.display} size="md" />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate font-display text-base font-black text-neutral-950 dark:text-white">
                            {topDistanceLeader.display}
                          </span>
                          <span className="text-[11px] font-medium text-neutral-500 dark:text-white/50">
                            {topDistanceLeader.ridesCount} sortie{topDistanceLeader.ridesCount > 1 ? "s" : ""} à vélo
                          </span>
                        </div>
                        <div className="text-right flex-none pl-2">
                          <span className="font-display text-lg font-black text-blue-600 dark:text-blue-400">
                            {fmtKm(topDistanceLeader.totalKm)}
                          </span>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-white/40">
                            distance
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400">Aucune donnée</p>
                    )}
                  </div>

                  {/* Bouton Top 10 Déroulable Km */}
                  {top10Distance.length > 1 && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setShowDistanceTop10((v) => !v)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white py-2 text-xs font-bold text-neutral-800 transition hover:bg-neutral-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.08]"
                      >
                        <span>{showDistanceTop10 ? "Masquer le TOP 10" : `Voir le TOP 10 Km (${top10Distance.length})`}</span>
                        <Icon name="chevDown" size={13} className={showDistanceTop10 ? "rotate-180 transition-transform" : "transition-transform"} />
                      </button>

                      {showDistanceTop10 && (
                        <div className="mt-2.5 flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200/60 bg-white p-1 dark:divide-white/[0.05] dark:border-white/10 dark:bg-[#1A1422]">
                          {top10Distance.map((m) => (
                            <div key={m.display} className="flex items-center gap-2.5 px-3 py-2 text-xs">
                              <span
                                className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-black ${
                                  m.rank === 1
                                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-300"
                                    : m.rank === 2
                                    ? "bg-slate-300/30 text-slate-700 dark:text-slate-200"
                                    : m.rank === 3
                                    ? "bg-amber-700/20 text-amber-800 dark:text-amber-400"
                                    : "bg-neutral-100 text-neutral-500 dark:bg-white/[0.05] dark:text-white/40"
                                }`}
                              >
                                {m.rank}
                              </span>
                              <Avatar name={m.display} seed={m.display} size="sm" />
                              <div className="min-w-0 flex-1">
                                <span className="truncate font-bold text-neutral-900 dark:text-white block">
                                  {m.display}
                                </span>
                                <span className="text-[10px] text-neutral-400 dark:text-white/40">
                                  {m.ridesCount} sortie{m.ridesCount > 1 ? "s" : ""}
                                </span>
                              </div>
                              <span className="font-extrabold text-blue-600 dark:text-blue-400 whitespace-nowrap flex-none">
                                {fmtKm(m.totalKm)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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

function GroupPills({ groups }: { groups?: Record<GroupLevel, number> }) {
  if (!groups || (groups.vert === 0 && groups.rouge === 0 && groups.violet === 0)) return null;

  return (
    <span className="flex items-center gap-1 text-[11px] font-black tracking-tight whitespace-nowrap flex-shrink-0">
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
