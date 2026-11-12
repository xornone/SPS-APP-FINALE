"use client";

import { useEffect, useMemo, useState } from "react";
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
import { createClient } from "@/lib/supabase/client";
import { isSuperAdmin } from "@/lib/notificationAdmins";

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

export interface PodiumEntry {
  rank: number;
  display: string;
  avatarSeed?: string;
  statFormatted: string;
  subStat?: string;
  groups?: Record<GroupLevel, number>;
  isFirstTie?: boolean;
}

export function MonthlyStatsSection({ rides, participations, stravaData }: MonthlyStatsSectionProps) {
  // Onglet principal sélectionné : "trophees" (Trophées du mois) ou "segment" (Le segment SPS du mois)
  const [activeTab, setActiveTab] = useState<"trophees" | "segment">("trophees");

  // Filtre d'onglet de trophée : commence directement par "attendance" (Plus Assidu)
  const [trophyFilter, setTrophyFilter] = useState<"attendance" | "elevation" | "distance" | "speed">("attendance");

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

  // Détection du compte connecté pour autoriser le scraping à la demande (th.tregaro@gmail.com uniquement)
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setCurrentUserEmail(data.user.email);
      }
    });
  }, []);

  const canManualScrape = isSuperAdmin(currentUserEmail);

  // Voyant de validité du token Strava (réservé à th.tregaro@gmail.com)
  const [tokenStatus, setTokenStatus] = useState<"idle" | "checking" | "valid" | "invalid">("checking");
  const [tokenInfo, setTokenInfo] = useState<{
    activeLabel?: string;
    details?: { label: string; connected: boolean; status: number }[];
  } | null>(null);

  const checkTokenStatus = async () => {
    setTokenStatus("checking");
    try {
      const res = await fetch("/api/admin/strava/status", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.connected) {
        setTokenStatus("valid");
        setTokenInfo({
          activeLabel: data.activeLabel,
          details: data.details,
        });
      } else {
        setTokenStatus("invalid");
        setTokenInfo(null);
      }
    } catch {
      setTokenStatus("invalid");
      setTokenInfo(null);
    }
  };

  useEffect(() => {
    if (canManualScrape) {
      checkTokenStatus();
    }
  }, [canManualScrape]);

  async function handleManualSync() {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch("/api/admin/strava/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months: [selectedMonth] }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur de synchronisation");
      }
      setSyncFeedback("Données Strava synchronisées avec succès ! Rechargement...");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncFeedback(`Erreur : ${msg}`);
    } finally {
      setIsSyncing(false);
    }
  }

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
    return rankedTopAttendance.slice(3, 10);
  }, [rankedTopAttendance]);

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

      // Fallback dynamique si topSpeed non précalculé
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

  // Construction des podiums pour chaque catégorie
  // 1. Assiduité
  const attendancePodiumFirst: PodiumEntry | null = topAttendanceLeaders[0]
    ? {
        rank: 1,
        display: topAttendanceLeaders[0].display,
        statFormatted: `${topAttendanceLeaders[0].ridesCount} sortie${topAttendanceLeaders[0].ridesCount > 1 ? "s" : ""}`,
        subStat: "sorties SPS",
        groups: topAttendanceLeaders[0].groups,
      }
    : null;

  const attendancePodiumSecond: PodiumEntry | null = isAttendanceTie
    ? {
        rank: 1,
        display: topAttendanceLeaders[1].display,
        statFormatted: `${topAttendanceLeaders[1].ridesCount} sortie${topAttendanceLeaders[1].ridesCount > 1 ? "s" : ""}`,
        subStat: "sorties SPS",
        groups: topAttendanceLeaders[1].groups,
        isFirstTie: true,
      }
    : attendancePodiumRest[0]
    ? {
        rank: 2,
        display: attendancePodiumRest[0].display,
        statFormatted: attendancePodiumRest[0].statFormatted,
        subStat: "sorties SPS",
        groups: attendancePodiumRest[0].groups,
      }
    : null;

  const attendancePodiumThird: PodiumEntry | null = isAttendanceTie
    ? topAttendanceLeaders.length > 2
      ? {
          rank: 1,
          display: topAttendanceLeaders[2].display,
          statFormatted: `${topAttendanceLeaders[2].ridesCount} sortie${topAttendanceLeaders[2].ridesCount > 1 ? "s" : ""}`,
          subStat: "sorties SPS",
          groups: topAttendanceLeaders[2].groups,
          isFirstTie: true,
        }
      : rankedTopAttendance[2]
      ? {
          rank: rankedTopAttendance[2].rank,
          display: rankedTopAttendance[2].display,
          statFormatted: rankedTopAttendance[2].statFormatted,
          subStat: "sorties SPS",
          groups: rankedTopAttendance[2].groups,
        }
      : null
    : attendancePodiumRest[1]
    ? {
        rank: 3,
        display: attendancePodiumRest[1].display,
        statFormatted: attendancePodiumRest[1].statFormatted,
        subStat: "sorties SPS",
        groups: attendancePodiumRest[1].groups,
      }
    : null;

  // 2. D+ (Maillot à pois)
  const elevationPodiumFirst: PodiumEntry | null = topElevationLeader
    ? {
        rank: 1,
        display: topElevationLeader.display,
        statFormatted: topElevationLeader.statFormatted,
      }
    : null;

  const elevationPodiumSecond: PodiumEntry | null = elevationPodiumRest[0]
    ? {
        rank: 2,
        display: elevationPodiumRest[0].display,
        statFormatted: elevationPodiumRest[0].statFormatted,
      }
    : null;

  const elevationPodiumThird: PodiumEntry | null = elevationPodiumRest[1]
    ? {
        rank: 3,
        display: elevationPodiumRest[1].display,
        statFormatted: elevationPodiumRest[1].statFormatted,
      }
    : null;

  // 3. Distance (Rouleur)
  const distancePodiumFirst: PodiumEntry | null = topDistanceLeader
    ? {
        rank: 1,
        display: topDistanceLeader.display,
        statFormatted: topDistanceLeader.statFormatted,
      }
    : null;

  const distancePodiumSecond: PodiumEntry | null = distancePodiumRest[0]
    ? {
        rank: 2,
        display: distancePodiumRest[0].display,
        statFormatted: distancePodiumRest[0].statFormatted,
      }
    : null;

  const distancePodiumThird: PodiumEntry | null = distancePodiumRest[1]
    ? {
        rank: 3,
        display: distancePodiumRest[1].display,
        statFormatted: distancePodiumRest[1].statFormatted,
      }
    : null;

  // 4. Vitesse
  const speedPodiumFirst: PodiumEntry | null = topSpeedLeader
    ? {
        rank: 1,
        display: topSpeedLeader.display,
        statFormatted: topSpeedLeader.statFormatted,
      }
    : null;

  const speedPodiumSecond: PodiumEntry | null = speedPodiumRest[0]
    ? {
        rank: 2,
        display: speedPodiumRest[0].display,
        statFormatted: speedPodiumRest[0].statFormatted,
      }
    : null;

  const speedPodiumThird: PodiumEntry | null = speedPodiumRest[1]
    ? {
        rank: 3,
        display: speedPodiumRest[1].display,
        statFormatted: speedPodiumRest[1].statFormatted,
      }
    : null;

  // 5. Segment
  const segmentLeader = segmentOfMonth.leaderboard[0] || null;
  const segmentPodiumRest = segmentOfMonth.leaderboard.slice(1, 3);
  const segmentRestTop10 = segmentOfMonth.leaderboard.slice(3, 10);

  const segmentPodiumFirst: PodiumEntry | null = segmentLeader
    ? {
        rank: 1,
        display: segmentLeader.officialName,
        avatarSeed: segmentLeader.officialName,
        statFormatted: formatChrono(segmentLeader.timeSeconds, segmentLeader.timeFormatted),
        subStat: `${segmentLeader.speedKmh} km/h`,
      }
    : null;

  const segmentPodiumSecond: PodiumEntry | null = segmentPodiumRest[0]
    ? {
        rank: 2,
        display: segmentPodiumRest[0].officialName,
        avatarSeed: segmentPodiumRest[0].officialName,
        statFormatted: formatChrono(segmentPodiumRest[0].timeSeconds, segmentPodiumRest[0].timeFormatted),
        subStat: `${segmentPodiumRest[0].speedKmh} km/h`,
      }
    : null;

  const segmentPodiumThird: PodiumEntry | null = segmentPodiumRest[1]
    ? {
        rank: 3,
        display: segmentPodiumRest[1].officialName,
        avatarSeed: segmentPodiumRest[1].officialName,
        statFormatted: formatChrono(segmentPodiumRest[1].timeSeconds, segmentPodiumRest[1].timeFormatted),
        subStat: `${segmentPodiumRest[1].speedKmh} km/h`,
      }
    : null;

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

              {/* Sélecteur de mois + Bouton Scraper Strava + Voyant d'état (visibles uniquement pour th.tregaro@gmail.com) */}
              <div className="flex flex-wrap items-center gap-2">
                {canManualScrape && (
                  <div className="flex items-center gap-1.5">
                    {/* Bouton Scraper Strava */}
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={handleManualSync}
                      className="flex items-center gap-1.5 rounded-xl border border-[#FC5200]/30 bg-[#FC5200]/10 px-3 py-1.5 text-xs font-black text-[#FC5200] transition hover:bg-[#FC5200]/20 active:scale-[0.98] disabled:opacity-50 dark:border-[#FC5200]/40 dark:bg-[#FC5200]/15"
                      title="Actualiser les données Strava immédiatement (réservé à th.tregaro@gmail.com)"
                    >
                      <span className={isSyncing ? "animate-spin inline-block" : ""}>🔄</span>
                      <span>{isSyncing ? "Scraping en cours..." : "Scraper Strava"}</span>
                    </button>

                    {/* Voyant de validité de la session Strava (cliquable pour re-tester) */}
                    <button
                      type="button"
                      onClick={checkTokenStatus}
                      className="flex items-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white px-2.5 py-1.5 text-xs font-bold text-neutral-700 shadow-xs transition hover:bg-neutral-50 active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.06] dark:text-white/80 dark:hover:bg-white/[0.1]"
                      title={
                        tokenStatus === "valid"
                          ? `Session active via ${tokenInfo?.activeLabel || "Principal"} (${
                              tokenInfo?.details?.filter((d) => d.connected).length || 1
                            }/3 comptes opérationnels) - Cliquer pour revérifier`
                          : tokenStatus === "invalid"
                          ? "Toutes les sessions Strava sont déconnectées ou expirées (cliquer pour revérifier)"
                          : "Test des sessions en cours..."
                      }
                    >
                      {tokenStatus === "checking" && (
                        <>
                          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                          <span className="text-[11px] font-semibold text-neutral-400">Test session...</span>
                        </>
                      )}
                      {tokenStatus === "valid" && (
                        <>
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                          <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                            Session active
                            {tokenInfo?.activeLabel && tokenInfo.activeLabel !== "Principal"
                              ? ` (${tokenInfo.activeLabel})`
                              : ""}
                          </span>
                        </>
                      )}
                      {tokenStatus === "invalid" && (
                        <>
                          <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse" />
                          <span className="text-[11px] font-black text-red-600 dark:text-red-400">
                            Sessions expirées
                          </span>
                        </>
                      )}
                      {tokenStatus === "idle" && (
                        <>
                          <span className="h-2 w-2 rounded-full bg-neutral-300 dark:bg-white/20" />
                          <span className="text-[11px] font-semibold text-neutral-400">Strava</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

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
            </div>

            {/* Notification retour de scraping manuel */}
            {syncFeedback && (
              <div
                className={`mt-3 rounded-xl px-3 py-1.5 text-xs font-bold ${
                  syncFeedback.startsWith("Erreur")
                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {syncFeedback}
              </div>
            )}

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

            {/* Onglets des trophées (commence directement par Plus Assidu) */}
            {activeTab === "trophees" && hasData && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-neutral-100 pt-3 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setTrophyFilter("attendance")}
                  className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                    trophyFilter === "attendance"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-white/[0.05] dark:text-white/60 dark:hover:bg-white/[0.08]"
                  }`}
                >
                  <span>🥇</span>
                  <span>Plus Assidu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTrophyFilter("elevation")}
                  className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                    trophyFilter === "elevation"
                      ? "bg-rose-500 text-white shadow-xs"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-white/[0.05] dark:text-white/60 dark:hover:bg-white/[0.08]"
                  }`}
                >
                  <span>🔴</span>
                  <span>Maillot à pois</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTrophyFilter("distance")}
                  className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                    trophyFilter === "distance"
                      ? "bg-blue-500 text-white shadow-xs"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-white/[0.05] dark:text-white/60 dark:hover:bg-white/[0.08]"
                  }`}
                >
                  <span>🚴</span>
                  <span>Rouleur</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTrophyFilter("speed")}
                  className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                    trophyFilter === "speed"
                      ? "bg-sps-violet600 text-white shadow-xs"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-white/[0.05] dark:text-white/60 dark:hover:bg-white/[0.08]"
                  }`}
                >
                  <span>⚡</span>
                  <span>Plus rapide</span>
                </button>
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
                <div className="p-5 flex flex-col max-w-xl mx-auto">
                  {/* 1. Assiduité du mois : 100% APP SPS */}
                  {trophyFilter === "attendance" && (
                    <TrophyCard
                      title="Plus Assidu du mois"
                      emoji="🥇"
                      sourceBadge={{ label: "App SPS", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" }}
                      badgeText={isAttendanceTie ? `${topAttendanceLeaders.length} ex æquo` : "TOP 3"}
                      subtitle="Sorties club réalisées dans l'application"
                      podiumFirst={attendancePodiumFirst}
                      podiumSecond={attendancePodiumSecond}
                      podiumThird={attendancePodiumThird}
                      themeColor="amber"
                      restList={attendanceRestTop10}
                      showRest={showAttendanceRest}
                      onToggleRest={() => setShowAttendanceRest((v) => !v)}
                      emptyMessage="Aucune participation club enregistrée"
                    />
                  )}

                  {/* 2. Maillot à pois du mois (Strava D+) */}
                  {trophyFilter === "elevation" && (
                    <TrophyCard
                      title="Maillot à pois du mois"
                      emoji="🔴"
                      sourceBadge={
                        topElevationLeader?.isStrava
                          ? { label: "Strava", color: "bg-[#FC5200]/15 text-[#FC5200]" }
                          : undefined
                      }
                      badgeText="TOP 3 D+"
                      subtitle="Top dénivelé positif cumulé du mois"
                      podiumFirst={elevationPodiumFirst}
                      podiumSecond={elevationPodiumSecond}
                      podiumThird={elevationPodiumThird}
                      themeColor="rose"
                      restList={elevationRestTop10}
                      showRest={showElevationRest}
                      onToggleRest={() => setShowElevationRest((v) => !v)}
                      emptyMessage="Aucune donnée enregistrée"
                    />
                  )}

                  {/* 3. Rouleur du mois (Strava Km) */}
                  {trophyFilter === "distance" && (
                    <TrophyCard
                      title="Rouleur du mois"
                      emoji="🚴"
                      sourceBadge={
                        topDistanceLeader?.isStrava
                          ? { label: "Strava", color: "bg-[#FC5200]/15 text-[#FC5200]" }
                          : undefined
                      }
                      badgeText="TOP 3 Km"
                      subtitle="Top distance cumulée du mois"
                      podiumFirst={distancePodiumFirst}
                      podiumSecond={distancePodiumSecond}
                      podiumThird={distancePodiumThird}
                      themeColor="blue"
                      restList={distanceRestTop10}
                      showRest={showDistanceRest}
                      onToggleRest={() => setShowDistanceRest((v) => !v)}
                      emptyMessage="Aucune donnée enregistrée"
                    />
                  )}

                  {/* 4. Le plus rapide du mois (Strava Vitesse moyenne) */}
                  {trophyFilter === "speed" && (
                    <TrophyCard
                      title="Le plus rapide du mois"
                      emoji="⚡"
                      sourceBadge={
                        topSpeedLeader?.isStrava
                          ? { label: "Strava", color: "bg-[#FC5200]/15 text-[#FC5200]" }
                          : undefined
                      }
                      badgeText="TOP 3 Vitesse"
                      subtitle="Top vitesse moyenne du mois (min. 30 km)"
                      podiumFirst={speedPodiumFirst}
                      podiumSecond={speedPodiumSecond}
                      podiumThird={speedPodiumThird}
                      themeColor="violet"
                      restList={speedRestTop10}
                      showRest={showSpeedRest}
                      onToggleRest={() => setShowSpeedRest((v) => !v)}
                      emptyMessage="Aucune donnée enregistrée"
                    />
                  )}
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
                    className="flex flex-none items-center justify-center gap-2 rounded-2xl bg-[#FC5200] px-4 py-2.5 text-xs font-black text-white shadow-xs transition hover:bg-[#e04900] active:scale-[0.98]"
                  >
                    <span>Ouvrir sur Strava</span>
                    <Icon name="extLink" size={13} />
                  </a>
                </div>
              </div>

              {/* Classement du Segment : Top 3 en Podium + déroulé TOP 10 */}
              <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div>
                  <div className="mb-2.5 flex items-center justify-between gap-1.5">
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

                  {/* Podium Segment : tout blanc pour les chronos */}
                  <TrophyPodium
                    first={segmentPodiumFirst}
                    second={segmentPodiumSecond}
                    third={segmentPodiumThird}
                    themeColor="strava"
                    emptyMessage="Aucun chrono enregistré sur le segment pour l'instant"
                  />
                </div>

                {/* Bouton Top 10 Déroulable Segment (#4 à #10) */}
                {segmentRestTop10.length > 0 && (
                  <div className="mt-3 border-t border-neutral-200/60 pt-2.5 dark:border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setShowSegmentRest((v) => !v)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white py-1.5 text-xs font-bold text-neutral-800 transition hover:bg-neutral-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.08]"
                    >
                      <span>
                        {showSegmentRest
                          ? "Réduire"
                          : `Afficher plus (TOP 10) (${segmentRestTop10.length})`}
                      </span>
                      <Icon
                        name="chevDown"
                        size={12}
                        className={
                          showSegmentRest ? "rotate-180 transition-transform" : "transition-transform"
                        }
                      />
                    </button>

                    {showSegmentRest && (
                      <div className="mt-2 flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200/60 bg-white p-1 dark:divide-white/[0.05] dark:border-white/10 dark:bg-[#1A1422]">
                        {segmentRestTop10.map((m) => (
                          <div key={m.officialName} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
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
                              <span className="text-sm font-bold text-neutral-900 dark:text-white whitespace-nowrap">
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

/**
 * Composant Podium Visuel Top 3 avec socles étagés (2e à gauche en Argent, 1er au centre en Or, 3e à droite en Bronze)
 * Le suffixe (er, e) est placé à côté du numéro pour éviter tout chevauchement vertical.
 * Les avatars ne comportent plus de pastille de numéro superflue.
 */
function TrophyPodium({
  first,
  second,
  third,
  themeColor = "amber",
  emptyMessage = "Aucun participant pour l'instant",
}: {
  first?: PodiumEntry | null;
  second?: PodiumEntry | null;
  third?: PodiumEntry | null;
  themeColor?: "amber" | "rose" | "blue" | "violet" | "strava";
  emptyMessage?: string;
}) {
  if (!first) {
    return (
      <div className="py-8 text-center text-xs font-semibold text-neutral-400 dark:text-white/40">
        {emptyMessage}
      </div>
    );
  }

  // Pour le segment, le temps est strictement blanc pour tous les coureurs
  const isSegment = themeColor === "strava";

  const firstStatColor = isSegment
    ? "text-neutral-950 dark:text-white"
    : {
        amber: "text-amber-600 dark:text-amber-400",
        rose: "text-rose-600 dark:text-rose-400",
        blue: "text-blue-600 dark:text-blue-400",
        violet: "text-sps-violet600 dark:text-sps-violet400",
        strava: "text-neutral-950 dark:text-white",
      }[themeColor];

  const restStatColor = isSegment
    ? "text-neutral-950 dark:text-white"
    : "text-neutral-800 dark:text-white/90";

  return (
    <div className="relative mt-2 pt-1">
      {/* Grille Podium 3 colonnes : 2e (gauche), 1er (centre), 3e (droite) */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 items-end">
        {/* --- 2ÈME PLACE (Gauche) - TOUJOURS ARGENT --- */}
        <div className="flex flex-col items-center justify-end w-full min-w-0 text-center">
          {second ? (
            <>
              {/* Badge Médaille */}
              <div className="mb-1 text-sm sm:text-base">
                {second.isFirstTie ? "🥇" : "🥈"}
              </div>

              {/* Avatar propre avec anneau Argent (ou Or si ex æquo 1er) */}
              <div className="mb-1">
                <Avatar
                  name={second.display}
                  seed={second.avatarSeed || second.display}
                  size="sm"
                  className={
                    second.isFirstTie
                      ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-white dark:ring-offset-[#130B22]"
                      : "ring-2 ring-slate-300 dark:ring-slate-500 ring-offset-1 ring-offset-white dark:ring-offset-[#130B22]"
                  }
                />
              </div>

              {/* Nom (même police standard) */}
              <span
                className="w-full truncate px-0.5 text-[11px] sm:text-xs font-bold text-neutral-800 dark:text-white/90 block"
                title={second.display}
              >
                {second.display}
              </span>

              {/* Group pills si app SPS */}
              {second.groups && (
                <div className="flex justify-center mt-0.5">
                  <GroupPills groups={second.groups} />
                </div>
              )}

              {/* Stat principale */}
              <span className={`text-[11px] sm:text-xs font-extrabold whitespace-nowrap block mt-0.5 ${restStatColor}`}>
                {second.statFormatted}
              </span>

              {/* Sous-stat */}
              {second.subStat && (
                <span className="text-[9px] sm:text-[10px] font-medium text-neutral-400 dark:text-white/40 truncate max-w-full block">
                  {second.subStat}
                </span>
              )}

              {/* Socle 2e (Argent) : numéro et suffixe à côté */}
              <div
                className={`mt-1.5 flex h-10 sm:h-12 w-full items-baseline justify-center gap-0.5 rounded-t-xl border-t-2 border-x ${
                  second.isFirstTie
                    ? "border-amber-400 dark:border-amber-400 bg-gradient-to-t from-amber-500/20 via-amber-400/10 to-transparent dark:from-amber-500/30 dark:via-amber-500/10 dark:to-transparent"
                    : "border-slate-300 dark:border-slate-500/80 bg-gradient-to-t from-slate-200/70 via-slate-100/40 to-transparent dark:from-slate-700/30 dark:via-slate-800/20 dark:to-transparent"
                } pt-2 shadow-xs`}
              >
                <span
                  className={`text-lg sm:text-xl font-black ${
                    second.isFirstTie ? "text-amber-500 dark:text-amber-400" : "text-slate-400 dark:text-slate-400"
                  }`}
                >
                  {second.isFirstTie ? "1" : "2"}
                </span>
                <span className="text-[10px] sm:text-[11px] font-black uppercase text-slate-400">
                  {second.isFirstTie ? "er ex" : "e"}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-end w-full opacity-40">
              <div className="mb-2 h-6 w-6 rounded-full border border-dashed border-neutral-300 dark:border-white/20 flex items-center justify-center text-[10px] text-neutral-400">
                -
              </div>
              <div className="h-8 w-full rounded-t-xl border-t-2 border-dashed border-neutral-300/60 dark:border-white/10 bg-neutral-100/40 dark:bg-white/[0.02]" />
            </div>
          )}
        </div>

        {/* --- 1ÈRE PLACE (Centre) - TOUJOURS OR --- */}
        <div className="flex flex-col items-center justify-end w-full min-w-0 text-center">
          {/* Badge Couronne */}
          <div className="mb-1 text-base sm:text-lg">
            👑
          </div>

          {/* Avatar propre avec anneau Or */}
          <div className="mb-1">
            <Avatar
              name={first.display}
              seed={first.avatarSeed || first.display}
              size="md"
              className="ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-[#130B22] shadow-sm"
            />
          </div>

          {/* Nom (même police standard que 2e et 3e) */}
          <span
            className="w-full truncate px-0.5 text-xs sm:text-sm font-bold text-neutral-950 dark:text-white block"
            title={first.display}
          >
            {first.display}
          </span>

          {/* Group pills si app SPS */}
          {first.groups && (
            <div className="flex justify-center mt-0.5">
              <GroupPills groups={first.groups} />
            </div>
          )}

          {/* Stat principale */}
          <span className={`text-xs sm:text-sm font-extrabold whitespace-nowrap block mt-0.5 ${firstStatColor}`}>
            {first.statFormatted}
          </span>

          {/* Sous-stat */}
          {first.subStat && (
            <span className="text-[10px] font-semibold text-neutral-500 dark:text-white/50 truncate max-w-full block">
              {first.subStat}
            </span>
          )}

          {/* Socle 1er (Or, le plus haut) : numéro et suffixe à côté */}
          <div className="mt-1.5 flex h-14 sm:h-16 w-full items-baseline justify-center gap-0.5 rounded-t-xl border-t-2 border-x border-amber-400 dark:border-amber-400 bg-gradient-to-t from-amber-400/25 via-amber-300/15 to-transparent dark:from-amber-500/30 dark:via-amber-500/10 dark:to-transparent pt-3 shadow-xs">
            <span className="text-xl sm:text-2xl font-black text-amber-500 dark:text-amber-400">
              1
            </span>
            <span className="text-[11px] sm:text-xs font-black uppercase text-amber-600/90 dark:text-amber-400/90">
              er
            </span>
          </div>
        </div>

        {/* --- 3ÈME PLACE (Droite) - TOUJOURS BRONZE --- */}
        <div className="flex flex-col items-center justify-end w-full min-w-0 text-center">
          {third ? (
            <>
              {/* Badge Médaille Bronze */}
              <div className="mb-1 text-sm sm:text-base">
                🥉
              </div>

              {/* Avatar propre avec anneau Bronze */}
              <div className="mb-1">
                <Avatar
                  name={third.display}
                  seed={third.avatarSeed || third.display}
                  size="sm"
                  className="ring-2 ring-amber-700/60 dark:ring-amber-600 ring-offset-1 ring-offset-white dark:ring-offset-[#130B22]"
                />
              </div>

              {/* Nom (même police standard) */}
              <span
                className="w-full truncate px-0.5 text-[11px] sm:text-xs font-bold text-neutral-800 dark:text-white/90 block"
                title={third.display}
              >
                {third.display}
              </span>

              {/* Group pills si app SPS */}
              {third.groups && (
                <div className="flex justify-center mt-0.5">
                  <GroupPills groups={third.groups} />
                </div>
              )}

              {/* Stat principale */}
              <span className={`text-[11px] sm:text-xs font-extrabold whitespace-nowrap block mt-0.5 ${restStatColor}`}>
                {third.statFormatted}
              </span>

              {/* Sous-stat */}
              {third.subStat && (
                <span className="text-[9px] sm:text-[10px] font-medium text-neutral-400 dark:text-white/40 truncate max-w-full block">
                  {third.subStat}
                </span>
              )}

              {/* Socle 3e (Bronze) : numéro et suffixe à côté (évite tout chevauchement) */}
              <div
                className={`mt-1.5 flex h-7 sm:h-8 w-full items-baseline justify-center gap-0.5 rounded-t-xl border-t-2 border-x ${
                  third.isFirstTie
                    ? "border-amber-400 dark:border-amber-400 bg-gradient-to-t from-amber-500/20 via-amber-400/10 to-transparent dark:from-amber-500/30 dark:via-amber-500/10 dark:to-transparent"
                    : "border-amber-700/50 dark:border-amber-700/60 bg-gradient-to-t from-amber-800/20 via-amber-900/10 to-transparent dark:from-amber-900/40 dark:to-transparent"
                } pt-1 shadow-xs`}
              >
                <span
                  className={`text-base sm:text-lg font-black ${
                    third.isFirstTie ? "text-amber-500 dark:text-amber-400" : "text-amber-700/90 dark:text-amber-500/90"
                  }`}
                >
                  {third.isFirstTie ? "1" : "3"}
                </span>
                <span className="text-[10px] font-black uppercase text-amber-700/70 dark:text-amber-500/70">
                  {third.isFirstTie ? "er ex" : "e"}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-end w-full opacity-40">
              <div className="mb-2 h-6 w-6 rounded-full border border-dashed border-neutral-300 dark:border-white/20 flex items-center justify-center text-[10px] text-neutral-400">
                -
              </div>
              <div className="h-6 w-full rounded-t-xl border-t-2 border-dashed border-neutral-300/60 dark:border-white/10 bg-neutral-100/40 dark:bg-white/[0.02]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Carte de Trophée avec Podium Top 3 et Accordéon TOP 10
 */
interface TrophyCardProps {
  title: string;
  emoji: string;
  sourceBadge?: { label: string; color: string };
  badgeText?: string;
  subtitle: string;
  podiumFirst: PodiumEntry | null;
  podiumSecond: PodiumEntry | null;
  podiumThird: PodiumEntry | null;
  themeColor: "amber" | "rose" | "blue" | "violet" | "strava";
  restList: LeaderDisplayItem[];
  showRest: boolean;
  onToggleRest: () => void;
  emptyMessage?: string;
}

function TrophyCard({
  title,
  emoji,
  sourceBadge,
  badgeText = "TOP 3",
  subtitle,
  podiumFirst,
  podiumSecond,
  podiumThird,
  themeColor,
  restList,
  showRest,
  onToggleRest,
  emptyMessage,
}: TrophyCardProps) {
  const badgeColorClass = {
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
    blue: "text-blue-600 dark:text-blue-400",
    violet: "text-sps-violet600 dark:text-sps-violet400",
    strava: "text-[#FC5200]",
  }[themeColor];

  const emojiBgClass = {
    amber: "bg-amber-500/10",
    rose: "bg-rose-500/10",
    blue: "bg-blue-500/10",
    violet: "bg-sps-violet600/10 text-sps-violet600 dark:text-sps-violet300",
    strava: "bg-[#FC5200]/15 text-[#FC5200]",
  }[themeColor];

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div>
        {/* Entête */}
        <div className="mb-2.5">
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <div className="flex min-w-0 items-center gap-1.5 flex-1">
              <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-lg ${emojiBgClass} text-xs`}>
                {emoji}
              </span>
              <h3 className="truncate text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                {title}
              </h3>
              {sourceBadge && (
                <span className={`flex-none rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase ${sourceBadge.color}`}>
                  {sourceBadge.label}
                </span>
              )}
            </div>
            <span className={`flex-none whitespace-nowrap text-[11px] font-black ${badgeColorClass}`}>
              {badgeText}
            </span>
          </div>
          <p className="mt-1 text-[10px] font-semibold text-neutral-400 dark:text-white/40">
            {subtitle}
          </p>
        </div>

        {/* Podium Top 3 */}
        <TrophyPodium
          first={podiumFirst}
          second={podiumSecond}
          third={podiumThird}
          themeColor={themeColor}
          emptyMessage={emptyMessage}
        />
      </div>

      {/* Bouton Top 10 Déroulable (#4 à #10) */}
      {restList.length > 0 && (
        <div className="mt-3 border-t border-neutral-200/60 pt-2.5 dark:border-white/[0.06]">
          <button
            type="button"
            onClick={onToggleRest}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white py-1.5 text-xs font-bold text-neutral-800 transition hover:bg-neutral-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.08]"
          >
            <span>{showRest ? "Réduire" : `Afficher plus (TOP 10) (${restList.length})`}</span>
            <Icon
              name="chevDown"
              size={12}
              className={showRest ? "rotate-180 transition-transform" : "transition-transform"}
            />
          </button>

          {showRest && (
            <div className="mt-2 flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200/60 bg-white p-1 dark:divide-white/[0.05] dark:border-white/10 dark:bg-[#1A1422]">
              {restList.map((m) => (
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
                        {m.groups && <GroupPills groups={m.groups} />}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-none pl-1">
                    <span className="font-bold text-neutral-700 dark:text-white/80 whitespace-nowrap">
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
  );
}

/**
 * Formatage chronométrique en MM:SS ou H:MM:SS
 */
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

/**
 * Pastilles de groupe SPS (Vert, Rouge, Violet)
 */
function GroupPills({ groups }: { groups?: Record<GroupLevel, number> }) {
  if (!groups || (groups.vert === 0 && groups.rouge === 0 && groups.violet === 0)) return null;

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-black tracking-tight whitespace-nowrap flex-shrink-0">
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
