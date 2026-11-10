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
import type { StravaDataStore, StravaSegmentOfMonth } from "@/lib/stravaScraper";

interface MonthlyStatsSectionProps {
  rides: Ride[];
  participations: Participation[];
  stravaData?: StravaDataStore | null;
}

interface LeaderDisplayItem {
  rank: number;
  display: string;
  ridesCount: number;
  statFormatted: string;
  statLabel: string;
  isStrava?: boolean;
  groups?: Record<GroupLevel, number>;
}

export function MonthlyStatsSection({ rides, participations, stravaData }: MonthlyStatsSectionProps) {
  // Onglet sélectionné : "trophees" (Trophées du mois) ou "segment" (Le segment SPS du mois)
  const [activeTab, setActiveTab] = useState<"trophees" | "segment">("trophees");

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
  const [showAttendanceRest, setShowAttendanceRest] = useState(false);
  const [showElevationRest, setShowElevationRest] = useState(false);
  const [showDistanceRest, setShowDistanceRest] = useState(false);
  const [showSpeedRest, setShowSpeedRest] = useState(false);
  const [showSegmentRest, setShowSegmentRest] = useState(false);

  function handleSelectMonth(monthKey: string) {
    setSelectedMonth(monthKey);
    setShowAttendanceRest(false);
    setShowElevationRest(false);
    setShowDistanceRest(false);
    setShowSpeedRest(false);
  }

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
  const rankedTopAttendance = useMemo<LeaderDisplayItem[]>(() => {
    let rank = 1;
    return stats.topAttendance.map((m, idx, arr) => {
      if (idx > 0 && m.ridesCount < arr[idx - 1].ridesCount) {
        rank = idx + 1;
      }
      return {
        rank,
        display: m.display,
        ridesCount: m.ridesCount,
        statFormatted: `${m.ridesCount} sortie${m.ridesCount > 1 ? "s" : ""}`,
        statLabel: "sorties",
        isStrava: false,
        groups: m.groups,
      };
    });
  }, [stats.topAttendance]);

  const attendancePodiumRest = useMemo(() => {
    return rankedTopAttendance.slice(topAttendanceLeaders.length, 3);
  }, [rankedTopAttendance, topAttendanceLeaders.length]);

  const attendanceRestTop10 = useMemo(() => {
    return rankedTopAttendance.slice(Math.max(3, topAttendanceLeaders.length), 10);
  }, [rankedTopAttendance, topAttendanceLeaders.length]);

  // 2. Maillot à pois du mois (TOP 10 D+) : Strava si dispo, sinon fallback App SPS
  const top10Elevation = useMemo<LeaderDisplayItem[]>(() => {
    if (hasStravaMonthData && stravaMonthLeaders?.topElevation) {
      return stravaMonthLeaders.topElevation
        .filter((m) => m.elev_gain_m > 0)
        .slice(0, 10)
        .map((m, idx) => ({
          rank: idx + 1,
          display: m.officialName,
          ridesCount: m.activities,
          statFormatted: fmtM(m.elev_gain_m),
          statLabel: "D+ cumulé",
          isStrava: true,
        }));
    }
    return stats.topElevation.slice(0, 10).map((m, idx) => ({
      rank: idx + 1,
      display: m.display,
      ridesCount: m.ridesCount,
      statFormatted: fmtM(m.totalElevation),
      statLabel: "D+ cumulé",
      isStrava: false,
    }));
  }, [hasStravaMonthData, stravaMonthLeaders, stats.topElevation]);

  const topElevationLeader = top10Elevation[0] || null;
  const elevationPodiumRest = top10Elevation.slice(1, 3);
  const elevationRestTop10 = top10Elevation.slice(3, 10);

  // 3. Rouleur du mois (TOP 10 Km) : Strava si dispo, sinon fallback App SPS
  const top10Distance = useMemo<LeaderDisplayItem[]>(() => {
    if (hasStravaMonthData && stravaMonthLeaders?.topDistance) {
      return stravaMonthLeaders.topDistance
        .filter((m) => m.distance_km > 0)
        .slice(0, 10)
        .map((m, idx) => ({
          rank: idx + 1,
          display: m.officialName,
          ridesCount: m.activities,
          statFormatted: fmtKm(m.distance_km),
          statLabel: "distance",
          isStrava: true,
        }));
    }
    return stats.topDistance.slice(0, 10).map((m, idx) => ({
      rank: idx + 1,
      display: m.display,
      ridesCount: m.ridesCount,
      statFormatted: fmtKm(m.totalKm),
      statLabel: "distance",
      isStrava: false,
    }));
  }, [hasStravaMonthData, stravaMonthLeaders, stats.topDistance]);

  const topDistanceLeader = top10Distance[0] || null;
  const distancePodiumRest = top10Distance.slice(1, 3);
  const distanceRestTop10 = top10Distance.slice(3, 10);

  // 4. Le plus rapide du mois (TOP 10 Vitesse moyenne) : Strava (min. 30 km)
  const top10Speed = useMemo<LeaderDisplayItem[]>(() => {
    if (hasStravaMonthData && stravaMonthLeaders) {
      if (stravaMonthLeaders.topSpeed && stravaMonthLeaders.topSpeed.length > 0) {
        return stravaMonthLeaders.topSpeed
          .filter((m) => (m.avg_speed_kmh || 0) > 0)
          .slice(0, 10)
          .map((m, idx) => ({
            rank: idx + 1,
            display: m.officialName,
            ridesCount: m.activities,
            statFormatted: `${(m.avg_speed_kmh || 0).toLocaleString("fr-FR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })} km/h`,
            statLabel: "vitesse moy.",
            isStrava: true,
          }));
      }

      // Fallback dynamique
      return (stravaMonthLeaders.topDistance || [])
        .map((m) => {
          const hMatch = (m.time || "").match(/(\d+)\s*h/i);
          const mMatch = (m.time || "").match(/(\d+)\s*m/i);
          const h = hMatch ? parseInt(hMatch[1], 10) : 0;
          const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
          const totalHours = h + mins / 60;
          const speed = totalHours > 0 ? Math.round((m.distance_km / totalHours) * 10) / 10 : 0;
          return {
            officialName: m.officialName,
            activities: m.activities,
            distance_km: m.distance_km,
            speed,
          };
        })
        .filter((m) => m.distance_km >= 30 && m.speed > 0)
        .sort((a, b) => b.speed - a.speed)
        .slice(0, 10)
        .map((m, idx) => ({
          rank: idx + 1,
          display: m.officialName,
          ridesCount: m.activities,
          statFormatted: `${m.speed.toLocaleString("fr-FR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })} km/h`,
          statLabel: "vitesse moy.",
          isStrava: true,
        }));
    }
    return [];
  }, [hasStravaMonthData, stravaMonthLeaders]);

  const topSpeedLeader = top10Speed[0] || null;
  const speedPodiumRest = top10Speed.slice(1, 3);
  const speedRestTop10 = top10Speed.slice(3, 10);

  // 5. Segment SPS du mois
  const segmentOfMonth: StravaSegmentOfMonth = useMemo(() => {
    if (stravaData?.segmentOfMonth) return stravaData.segmentOfMonth;
    return {
      segmentId: "42510565",
      name: "SPS - Corum to Combaillaux",
      distance_km: 14.2,
      elev_gain_m: 271,
      avg_grade: 1.1,
      stravaUrl: "https://www.strava.com/segments/42510565",
      appUrl: "https://strava.app.link/APRoWoo5W7b",
      leaderboard: [
        {
          rank: 1,
          officialName: "Aymeric Closier",
          stravaName: "Aymeric Closier",
          athleteId: "3717532",
          avatar: "https://dgalywyr863hv.cloudfront.net/pictures/athletes/3717532/1327472/5/large.jpg",
          timeSeconds: 2074,
          timeFormatted: "34:34",
          speedKmh: 24.6,
          date: "2026-11-08",
        },
        {
          rank: 2,
          officialName: "Lucas Nesta",
          stravaName: "Lucas Nesta",
          athleteId: "101371287",
          avatar: null,
          timeSeconds: 2097,
          timeFormatted: "34:57",
          speedKmh: 24.4,
          date: "2026-11-08",
        },
        {
          rank: 3,
          officialName: "Pierrick Pinault",
          stravaName: "Papo Kano",
          athleteId: "58548359",
          avatar: null,
          timeSeconds: 2109,
          timeFormatted: "35:09",
          speedKmh: 24.2,
          date: "2026-11-08",
        },
        {
          rank: 4,
          officialName: "Nicholas Sydenham",
          stravaName: "Nicholas Sydenham",
          athleteId: "40596719",
          avatar: null,
          timeSeconds: 2115,
          timeFormatted: "35:15",
          speedKmh: 24.2,
          date: "2026-11-08",
        },
        {
          rank: 5,
          officialName: "Audrey Mignon",
          stravaName: "Audrey Mignon",
          athleteId: "122755976",
          avatar: null,
          timeSeconds: 2128,
          timeFormatted: "35:28",
          speedKmh: 24.0,
          date: "2026-11-08",
        },
        {
          rank: 6,
          officialName: "Cédric Baudinet",
          stravaName: "Cédric Baudinet",
          athleteId: "23843091",
          avatar: null,
          timeSeconds: 2145,
          timeFormatted: "35:45",
          speedKmh: 23.8,
          date: "2026-11-08",
        },
      ],
    };
  }, [stravaData?.segmentOfMonth]);

  const segmentLeader = segmentOfMonth.leaderboard[0] || null;
  const segmentPodiumRest = segmentOfMonth.leaderboard.slice(1, 3);
  const segmentRestTop10 = segmentOfMonth.leaderboard.slice(3, 10);

  if (!months || months.length === 0) return null;

  const hasData =
    stats.totalParticipationsInMonth > 0 ||
    stats.totalRidesInMonth > 0 ||
    hasStravaMonthData;

  return (
    <AdminOnly>
      <section className="px-5">
        <div className="overflow-hidden rounded-[28px] border border-neutral-200/90 bg-white shadow-xs transition dark:border-white/10 dark:bg-[#130B22]/90">
          {/* Header avec Onglets de navigation + Sélecteur de mois */}
          <div className="border-b border-neutral-100 p-5 dark:border-white/[0.08]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Onglets principaux */}
              <div className="flex items-center gap-1.5 rounded-2xl bg-neutral-100/90 p-1 dark:bg-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setActiveTab("trophees")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                    activeTab === "trophees"
                      ? "bg-white text-neutral-950 shadow-xs dark:bg-[#1A1422] dark:text-white"
                      : "text-neutral-500 hover:text-neutral-900 dark:text-white/60 dark:hover:text-white"
                  }`}
                >
                  <span className="text-sm">🏆</span>
                  <span>Trophées du mois</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("segment")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                    activeTab === "segment"
                      ? "bg-white text-neutral-950 shadow-xs dark:bg-[#1A1422] dark:text-white"
                      : "text-neutral-500 hover:text-neutral-900 dark:text-white/60 dark:hover:text-white"
                  }`}
                >
                  <span className="text-sm">⏱️</span>
                  <span>Le segment SPS du mois</span>
                </button>
              </div>

              {/* Sélecteur de mois (visible pour l'onglet Trophées) */}
              {activeTab === "trophees" && (
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => handleSelectMonth(e.target.value)}
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
              )}
            </div>

            {/* Chiffres collectifs du mois (visible pour l'onglet Trophées) */}
            {activeTab === "trophees" && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <div className="col-span-2 sm:col-span-1 rounded-2xl border border-neutral-100 bg-neutral-50/80 p-3 text-center dark:border-white/[0.06] dark:bg-white/[0.03]">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-white/40">
                    Sorties SPS
                  </span>
                  <span className="font-display text-lg font-black text-neutral-900 dark:text-white">
                    {stats.totalRidesInMonth}
                  </span>
                </div>

                <div className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-2.5 text-center dark:border-white/[0.06] dark:bg-white/[0.03]">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-white/40">
                    Membres actifs
                  </span>
                  <div className="flex items-baseline justify-center gap-1 font-display text-base font-black text-emerald-600 dark:text-emerald-400">
                    <span>{stats.uniqueActiveMembersInMonth}</span>
                    <span className="text-xs font-bold text-neutral-400 dark:text-white/40">/ 100</span>
                  </div>
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
                    {hasStravaMonthData && stravaMonthLeaders
                      ? `${stravaMonthLeaders.totalKm.toLocaleString("fr-FR")} km`
                      : fmtKm(stats.totalKmInMonth)}
                  </span>
                </div>

                <div className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-2.5 text-center dark:border-white/[0.06] dark:bg-white/[0.03]">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-white/40">
                    Cumul D+
                  </span>
                  <span className="font-display text-base font-black text-neutral-900 dark:text-white">
                    {hasStravaMonthData && stravaMonthLeaders
                      ? `${stravaMonthLeaders.totalElevation.toLocaleString("fr-FR")} m`
                      : fmtM(stats.totalElevationInMonth)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* VUE 1 : TROPHÉES DU MOIS */}
          {activeTab === "trophees" && (
            <>
              {!hasData ? (
                <div className="p-8 text-center text-sm font-semibold text-neutral-400 dark:text-white/40">
                  Aucune donnée enregistrée pour {formatMonthLabel(selectedMonth)}.
                </div>
              ) : (
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. Assiduité du mois : 100% APP SPS */}
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
                            {isAttendanceTie ? `${topAttendanceLeaders.length} ex æquo` : "TOP 3"}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] font-semibold text-neutral-400 dark:text-white/40">
                          Sorties club réalisées dans l&apos;application
                        </p>
                      </div>

                      {/* N°1 (Leader ou ex æquo) */}
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

                      {/* 2e et 3e du Podium Assiduité (Toujours visibles) */}
                      {attendancePodiumRest.length > 0 && (
                        <div className="mt-2.5 flex flex-col gap-1.5">
                          {attendancePodiumRest.map((m) => (
                            <div
                              key={m.display}
                              className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-1.5 text-xs border border-neutral-100 dark:border-white/[0.05] dark:bg-white/[0.02]"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-black ${
                                    m.rank === 2
                                      ? "bg-slate-300/30 text-slate-700 dark:text-slate-200"
                                      : "bg-amber-700/20 text-amber-800 dark:text-amber-400"
                                  }`}
                                >
                                  #{m.rank}
                                </span>
                                <Avatar name={m.display} seed={m.display} size="sm" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span className="truncate font-semibold text-neutral-800 dark:text-white/80 block">
                                      {m.display}
                                    </span>
                                    <GroupPills groups={m.groups} />
                                  </div>
                                </div>
                              </div>
                              <span className="font-extrabold text-neutral-700 dark:text-white/80 whitespace-nowrap flex-none">
                                {m.statFormatted}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bouton Top 10 Déroulable (#4 à #10) */}
                    {attendanceRestTop10.length > 0 && (
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => setShowAttendanceRest((v) => !v)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white py-1.5 text-xs font-bold text-neutral-800 transition hover:bg-neutral-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.08]"
                    >
                      <span>{showAttendanceRest ? "Réduire" : `Afficher plus (TOP 10)`}</span>
                      <Icon
                        name="chevDown"
                        size={12}
                        className={showAttendanceRest ? "rotate-180 transition-transform" : "transition-transform"}
                      />
                    </button>

                    {showAttendanceRest && (
                      <div className="mt-2 flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200/60 bg-white p-1 dark:divide-white/[0.05] dark:border-white/10 dark:bg-[#1A1422]">
                        {attendanceRestTop10.map((m) => (
                          <div key={m.display} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-neutral-100 text-[10px] font-black text-neutral-500 dark:bg-white/[0.05] dark:text-white/40">
                                #{m.rank}
                              </span>
                              <Avatar name={m.display} seed={m.display} size="sm" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1 min-w-0">
                                  <span className="truncate font-semibold text-neutral-800 dark:text-white/80 block">
                                    {m.display}
                                  </span>
                                  <GroupPills groups={m.groups} />
                                </div>
                              </div>
                            </div>
                            <span className="font-extrabold text-neutral-600 dark:text-white/60 whitespace-nowrap flex-none">
                              {m.statFormatted}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Maillot à pois du mois (Strava D+) */}
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
                        TOP 3 D+
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] font-semibold text-neutral-400 dark:text-white/40">
                      Top dénivelé positif cumulé du mois
                    </p>
                  </div>

                  {/* N°1 Maillot à pois */}
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
                          {topElevationLeader.statFormatted}
                        </span>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-white/40">
                          {topElevationLeader.statLabel}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400">Aucune donnée</p>
                  )}

                  {/* 2e et 3e du Podium D+ (Toujours visibles) */}
                  {elevationPodiumRest.length > 0 && (
                    <div className="mt-2.5 flex flex-col gap-1.5">
                      {elevationPodiumRest.map((m) => (
                        <div
                          key={m.display}
                          className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-1.5 text-xs border border-neutral-100 dark:border-white/[0.05] dark:bg-white/[0.02]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-black ${
                                m.rank === 2
                                  ? "bg-slate-300/30 text-slate-700 dark:text-slate-200"
                                  : "bg-amber-700/20 text-amber-800 dark:text-amber-400"
                              }`}
                            >
                              #{m.rank}
                            </span>
                            <Avatar name={m.display} seed={m.display} size="sm" />
                            <div className="min-w-0 flex-1">
                              <span className="truncate font-semibold text-neutral-800 dark:text-white/80 block">
                                {m.display}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-none pl-1">
                            <span className="text-[10px] text-neutral-400 dark:text-white/40">
                              {m.ridesCount} sortie{m.ridesCount > 1 ? "s" : ""}
                            </span>
                            <span className="font-extrabold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                              {m.statFormatted}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bouton Top 10 Déroulable (#4 à #10) */}
                {elevationRestTop10.length > 0 && (
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => setShowElevationRest((v) => !v)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white py-1.5 text-xs font-bold text-neutral-800 transition hover:bg-neutral-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.08]"
                    >
                      <span>{showElevationRest ? "Réduire" : `Afficher plus (TOP 10)`}</span>
                      <Icon
                        name="chevDown"
                        size={12}
                        className={showElevationRest ? "rotate-180 transition-transform" : "transition-transform"}
                      />
                    </button>

                    {showElevationRest && (
                      <div className="mt-2 flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200/60 bg-white p-1 dark:divide-white/[0.05] dark:border-white/10 dark:bg-[#1A1422]">
                        {elevationRestTop10.map((m) => (
                          <div key={m.display} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-neutral-100 text-[10px] font-black text-neutral-500 dark:bg-white/[0.05] dark:text-white/40">
                                #{m.rank}
                              </span>
                              <Avatar name={m.display} seed={m.display} size="sm" />
                              <div className="min-w-0 flex-1">
                                <span className="truncate font-semibold text-neutral-800 dark:text-white/80 block">
                                  {m.display}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-none pl-1">
                              <span className="text-[10px] text-neutral-400 dark:text-white/40">
                                {m.ridesCount} sortie{m.ridesCount > 1 ? "s" : ""}
                              </span>
                              <span className="font-extrabold text-neutral-600 dark:text-white/60 whitespace-nowrap">
                                {m.statFormatted}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Rouleur du mois (Strava Km) */}
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
                        TOP 3 Km
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] font-semibold text-neutral-400 dark:text-white/40">
                      Top distance cumulée du mois
                    </p>
                  </div>

                  {/* N°1 Rouleur */}
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
                          {topDistanceLeader.statFormatted}
                        </span>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-white/40">
                          {topDistanceLeader.statLabel}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400">Aucune donnée</p>
                  )}

                  {/* 2e et 3e du Podium Km (Toujours visibles) */}
                  {distancePodiumRest.length > 0 && (
                    <div className="mt-2.5 flex flex-col gap-1.5">
                      {distancePodiumRest.map((m) => (
                        <div
                          key={m.display}
                          className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-1.5 text-xs border border-neutral-100 dark:border-white/[0.05] dark:bg-white/[0.02]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-black ${
                                m.rank === 2
                                  ? "bg-slate-300/30 text-slate-700 dark:text-slate-200"
                                  : "bg-amber-700/20 text-amber-800 dark:text-amber-400"
                              }`}
                            >
                              #{m.rank}
                            </span>
                            <Avatar name={m.display} seed={m.display} size="sm" />
                            <div className="min-w-0 flex-1">
                              <span className="truncate font-semibold text-neutral-800 dark:text-white/80 block">
                                {m.display}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-none pl-1">
                            <span className="text-[10px] text-neutral-400 dark:text-white/40">
                              {m.ridesCount} sortie{m.ridesCount > 1 ? "s" : ""}
                            </span>
                            <span className="font-extrabold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                              {m.statFormatted}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bouton Top 10 Déroulable (#4 à #10) */}
                {distanceRestTop10.length > 0 && (
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => setShowDistanceRest((v) => !v)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white py-1.5 text-xs font-bold text-neutral-800 transition hover:bg-neutral-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.08]"
                    >
                      <span>{showDistanceRest ? "Réduire" : `Afficher plus (TOP 10)`}</span>
                      <Icon
                        name="chevDown"
                        size={12}
                        className={showDistanceRest ? "rotate-180 transition-transform" : "transition-transform"}
                      />
                    </button>

                    {showDistanceRest && (
                      <div className="mt-2 flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200/60 bg-white p-1 dark:divide-white/[0.05] dark:border-white/10 dark:bg-[#1A1422]">
                        {distanceRestTop10.map((m) => (
                          <div key={m.display} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-neutral-100 text-[10px] font-black text-neutral-500 dark:bg-white/[0.05] dark:text-white/40">
                                #{m.rank}
                              </span>
                              <Avatar name={m.display} seed={m.display} size="sm" />
                              <div className="min-w-0 flex-1">
                                <span className="truncate font-semibold text-neutral-800 dark:text-white/80 block">
                                  {m.display}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-none pl-1">
                              <span className="text-[10px] text-neutral-400 dark:text-white/40">
                                {m.ridesCount} sortie{m.ridesCount > 1 ? "s" : ""}
                              </span>
                              <span className="font-extrabold text-neutral-600 dark:text-white/60 whitespace-nowrap">
                                {m.statFormatted}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Le plus rapide du mois (Strava Vitesse moyenne) */}
              <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div>
                  <div className="mb-3">
                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5 flex-1">
                        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-sps-violet600/10 text-xs text-sps-violet600 dark:text-sps-violet300">
                          ⚡
                        </span>
                        <h3 className="truncate text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                          Le plus rapide du mois
                        </h3>
                        {topSpeedLeader?.isStrava && (
                          <span className="flex-none rounded-full bg-[#FC5200]/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#FC5200]">
                            Strava
                          </span>
                        )}
                      </div>
                      <span className="flex-none whitespace-nowrap text-[11px] font-black text-sps-violet600 dark:text-sps-violet400">
                        TOP 3 Vitesse
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] font-semibold text-neutral-400 dark:text-white/40">
                      Top vitesse moyenne du mois (min. 30 km)
                    </p>
                  </div>

                  {/* N°1 Vitesse */}
                  {topSpeedLeader ? (
                    <div className="flex items-center gap-3 rounded-xl border border-sps-violet600/25 bg-sps-violet600/[0.04] p-3">
                      <Avatar name={topSpeedLeader.display} seed={topSpeedLeader.display} size="md" />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-display text-base font-black text-neutral-950 dark:text-white">
                          {topSpeedLeader.display}
                        </span>
                        <span className="text-[11px] font-medium text-neutral-500 dark:text-white/50">
                          {topSpeedLeader.ridesCount} sortie{topSpeedLeader.ridesCount > 1 ? "s" : ""} à vélo
                        </span>
                      </div>
                      <div className="text-right flex-none pl-2">
                        <span className="font-display text-lg font-black text-sps-violet600 dark:text-sps-violet400">
                          {topSpeedLeader.statFormatted}
                        </span>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-white/40">
                          {topSpeedLeader.statLabel}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400">Aucune donnée</p>
                  )}

                  {/* 2e et 3e du Podium Vitesse (Toujours visibles) */}
                  {speedPodiumRest.length > 0 && (
                    <div className="mt-2.5 flex flex-col gap-1.5">
                      {speedPodiumRest.map((m) => (
                        <div
                          key={m.display}
                          className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-1.5 text-xs border border-neutral-100 dark:border-white/[0.05] dark:bg-white/[0.02]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-black ${
                                m.rank === 2
                                  ? "bg-slate-300/30 text-slate-700 dark:text-slate-200"
                                  : "bg-amber-700/20 text-amber-800 dark:text-amber-400"
                              }`}
                            >
                              #{m.rank}
                            </span>
                            <Avatar name={m.display} seed={m.display} size="sm" />
                            <div className="min-w-0 flex-1">
                              <span className="truncate font-semibold text-neutral-800 dark:text-white/80 block">
                                {m.display}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-none pl-1">
                            <span className="text-[10px] text-neutral-400 dark:text-white/40">
                              {m.ridesCount} sortie{m.ridesCount > 1 ? "s" : ""}
                            </span>
                            <span className="font-extrabold text-sps-violet600 dark:text-sps-violet400 whitespace-nowrap">
                              {m.statFormatted}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bouton Top 10 Déroulable (#4 à #10) */}
                {speedRestTop10.length > 0 && (
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => setShowSpeedRest((v) => !v)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white py-1.5 text-xs font-bold text-neutral-800 transition hover:bg-neutral-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.08]"
                    >
                      <span>{showSpeedRest ? "Réduire" : `Afficher plus (TOP 10)`}</span>
                      <Icon
                        name="chevDown"
                        size={12}
                        className={showSpeedRest ? "rotate-180 transition-transform" : "transition-transform"}
                      />
                    </button>

                    {showSpeedRest && (
                      <div className="mt-2 flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200/60 bg-white p-1 dark:divide-white/[0.05] dark:border-white/10 dark:bg-[#1A1422]">
                        {speedRestTop10.map((m) => (
                          <div key={m.display} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-neutral-100 text-[10px] font-black text-neutral-500 dark:bg-white/[0.05] dark:text-white/40">
                                #{m.rank}
                              </span>
                              <Avatar name={m.display} seed={m.display} size="sm" />
                              <div className="min-w-0 flex-1">
                                <span className="truncate font-semibold text-neutral-800 dark:text-white/80 block">
                                  {m.display}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-none pl-1">
                              <span className="text-[10px] text-neutral-400 dark:text-white/40">
                                {m.ridesCount} sortie{m.ridesCount > 1 ? "s" : ""}
                              </span>
                              <span className="font-extrabold text-neutral-600 dark:text-white/60 whitespace-nowrap">
                                {m.statFormatted}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* VUE 2 : LE SEGMENT SPS DU MOIS */}
      {activeTab === "segment" && (
        <div className="p-5 flex flex-col gap-4">
          {/* Fiche d'identité du segment */}
          <div className="relative overflow-hidden rounded-2xl border border-[#FC5200]/25 bg-gradient-to-br from-[#FC5200]/10 via-[#FC5200]/5 to-transparent p-5 dark:border-[#FC5200]/20 dark:from-[#FC5200]/15 dark:via-[#FC5200]/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FC5200]/20 text-xs">
                    ⏱️
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#FC5200]">
                    Segment officiel SPS · Novembre
                  </span>
                </div>
                <h3 className="mt-1 font-display text-xl font-black text-neutral-950 dark:text-white">
                  {segmentOfMonth.name}
                </h3>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-white/50">
                  Du Corum (Montpellier) jusqu&apos;à l&apos;entrée de Combaillaux
                </p>

                {/* Métriques du segment */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-xs font-black text-neutral-900 shadow-xs dark:bg-white/10 dark:text-white">
                    <span>📏</span> {segmentOfMonth.distance_km} km
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-xs font-black text-neutral-900 shadow-xs dark:bg-white/10 dark:text-white">
                    <span>⛰️</span> +{segmentOfMonth.elev_gain_m} m D+
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-xs font-black text-neutral-900 shadow-xs dark:bg-white/10 dark:text-white">
                    <span>📈</span> {segmentOfMonth.avg_grade} % moy.
                  </span>
                </div>
              </div>

              {/* Bouton Lien Strava */}
              <a
                href={segmentOfMonth.appUrl || segmentOfMonth.stravaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FC5200] px-4 py-2.5 text-xs font-black text-white shadow-md shadow-[#FC5200]/20 transition hover:bg-[#E04900] active:scale-95"
              >
                <span>Ouvrir sur Strava</span>
                <span className="text-sm">↗</span>
              </a>
            </div>
          </div>

          {/* Classement du Segment : Top 3 + développé TOP 10 */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div>
              <div className="mb-3 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-[#FC5200]/15 text-xs">
                    🏆
                  </span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                    Classement adhérents SPS
                  </h4>
                </div>
                <span className="text-[11px] font-black text-[#FC5200]">
                  TOP 3 PODIUM
                </span>
              </div>

              {/* N°1 Segment */}
              {segmentLeader ? (
                <div className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-3.5 shadow-xs">
                  <div className="relative">
                    <Avatar name={segmentLeader.officialName} seed={segmentLeader.officialName} size="md" />
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-black text-white shadow-xs">
                      1
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-display text-base font-black text-neutral-950 dark:text-white">
                      {segmentLeader.officialName}
                    </span>
                    <span className="text-[11px] font-semibold text-neutral-500 dark:text-white/50">
                      {segmentLeader.speedKmh} km/h de moyenne · {segmentLeader.date ? new Date(segmentLeader.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "Ce mois"}
                    </span>
                  </div>
                  <div className="text-right flex-none pl-2">
                    <span className="font-display text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                      {formatChrono(segmentLeader.timeSeconds, segmentLeader.timeFormatted)}
                    </span>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-white/40">
                      chrono
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-neutral-400">Aucun chrono enregistré sur le segment pour l&apos;instant</p>
              )}

              {/* 2e et 3e du Podium Segment (Toujours visibles) */}
              {segmentPodiumRest.length > 0 && (
                <div className="mt-2.5 flex flex-col gap-1.5">
                  {segmentPodiumRest.map((m) => (
                    <div
                      key={m.officialName}
                      className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs border border-neutral-100 dark:border-white/[0.05] dark:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-black ${
                            m.rank === 2
                              ? "bg-slate-300/30 text-slate-700 dark:text-slate-200"
                              : "bg-amber-700/20 text-amber-800 dark:text-amber-400"
                          }`}
                        >
                          #{m.rank}
                        </span>
                        <Avatar name={m.officialName} seed={m.officialName} size="sm" />
                        <div className="min-w-0 flex-1">
                          <span className="truncate font-semibold text-neutral-800 dark:text-white/80 block">
                            {m.officialName}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 flex-none pl-1">
                        <span className="text-[11px] font-semibold text-neutral-400 dark:text-white/40">
                          {m.speedKmh} km/h
                        </span>
                        <span className="font-display text-sm font-black text-neutral-900 dark:text-white whitespace-nowrap">
                          {formatChrono(m.timeSeconds, m.timeFormatted)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bouton Top 10 Déroulable Segment (#4 à #10) */}
            {segmentRestTop10.length > 0 && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowSegmentRest((v) => !v)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white py-2 text-xs font-bold text-neutral-800 transition hover:bg-neutral-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.08]"
                >
                  <span>{showSegmentRest ? "Réduire" : `Afficher plus (TOP 10) (${segmentOfMonth.leaderboard.length})`}</span>
                  <Icon
                    name="chevDown"
                    size={12}
                    className={showSegmentRest ? "rotate-180 transition-transform" : "transition-transform"}
                  />
                </button>

                {showSegmentRest && (
                  <div className="mt-2 flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200/60 bg-white p-1 dark:divide-white/[0.05] dark:border-white/10 dark:bg-[#1A1422]">
                    {segmentRestTop10.map((m) => (
                      <div key={m.officialName} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-neutral-100 text-[10px] font-black text-neutral-500 dark:bg-white/[0.05] dark:text-white/40">
                            #{m.rank}
                          </span>
                          <Avatar name={m.officialName} seed={m.officialName} size="sm" />
                          <div className="min-w-0 flex-1">
                            <span className="truncate font-semibold text-neutral-800 dark:text-white/80 block">
                              {m.officialName}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 flex-none pl-1">
                          <span className="text-[11px] font-semibold text-neutral-400 dark:text-white/40">
                            {m.speedKmh} km/h
                          </span>
                          <span className="font-display text-sm font-black text-neutral-900 dark:text-white whitespace-nowrap">
                            {formatChrono(m.timeSeconds, m.timeFormatted)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </section>
</AdminOnly>
);
}

function formatChrono(seconds?: number, rawStr?: string): string {
  if (typeof seconds === "number" && seconds > 0) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const sStr = s < 10 ? `0${s}` : `${s}`;
    if (h > 0) {
      const mStr = m < 10 ? `0${m}` : `${m}`;
      return `${h}:${mStr}:${sStr}`;
    }
    return `${m}:${sStr}`;
  }
  if (rawStr) {
    if (/^\d+:\d{2}$/.test(rawStr.trim())) return rawStr.trim();
    const cleaned = rawStr.replace(/m\s*/gi, ":").replace(/s/gi, "").trim();
    if (cleaned.includes(":")) return cleaned;
  }
  return rawStr || "0:00";
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
