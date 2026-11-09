import type { GroupLevel, Participation, Ride } from "./types";
import { findOfficialMember } from "./members";

const FRENCH_MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export interface MonthlyMemberStats {
  display: string;
  ridesCount: number;
  totalKm: number;
  totalElevation: number;
  groups: Record<GroupLevel, number>;
}

export interface MonthlySummary {
  monthKey: string; // "2026-11"
  monthLabel: string; // "Novembre 2026"
  totalRidesInMonth: number;
  totalParticipationsInMonth: number; // Total cumulé de toutes les participations
  uniqueActiveMembersInMonth: number; // Nombre de membres distincts ayant roulé
  totalKmInMonth: number;
  totalElevationInMonth: number;
  // Trophées du mois
  topAttendance: MonthlyMemberStats[]; // Membre qui a fait le plus de sorties + TOP 10
  topElevation: MonthlyMemberStats[]; // Grimpeur du mois (TOP 3 D+)
  topDistance: MonthlyMemberStats[]; // Rouleur du mois (TOP 3 Km)
  groupDistribution: Record<GroupLevel, number>;
}

export function formatMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month || month < 1 || month > 12) return monthKey;
  return `${FRENCH_MONTHS[month - 1]} ${year}`;
}

/**
 * Retourne la liste ordonnée des mois disponibles (décroissant).
 */
export function getAvailableMonths(rides: Ride[]): { key: string; label: string }[] {
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const keysSet = new Set<string>();
  keysSet.add(currentKey);

  for (const r of rides) {
    if (r.ride_date && r.ride_date.length >= 7) {
      keysSet.add(r.ride_date.slice(0, 7));
    }
  }

  const sortedKeys = Array.from(keysSet).sort().reverse();
  return sortedKeys.map((key) => ({
    key,
    label: formatMonthLabel(key),
  }));
}

/**
 * Calcule les statistiques complètes d'un mois donné.
 */
export function computeMonthlyStats(
  rides: Ride[],
  participations: Participation[],
  targetMonthKey?: string
): MonthlySummary {
  const now = new Date();
  const monthKey =
    targetMonthKey ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const monthLabel = formatMonthLabel(monthKey);

  // 1. Filtrer les sorties du mois
  const monthRides = rides.filter((r) => r.ride_date && r.ride_date.startsWith(monthKey));
  const monthRidesById = new Map<string, Ride>(monthRides.map((r) => [r.id, r]));

  // 2. Filtrer les participations associées à ces sorties
  const monthParticipations = participations.filter((p) => monthRidesById.has(p.ride_id));

  // 3. Totaux globaux du mois
  const totalRidesInMonth = monthRides.length;
  const totalParticipationsInMonth = monthParticipations.length;
  const groupDistribution: Record<GroupLevel, number> = { vert: 0, rouge: 0, violet: 0 };

  let totalKmInMonth = 0;
  let totalElevationInMonth = 0;

  // 4. Agrégation par membre réconcilié
  const memberStatsMap = new Map<
    string,
    {
      display: string;
      ridesCount: number;
      totalKm: number;
      totalElevation: number;
      groups: Record<GroupLevel, number>;
    }
  >();

  const getOrCreateMember = (rawName: string) => {
    const officialName = findOfficialMember(rawName) || rawName.trim();
    if (!memberStatsMap.has(officialName)) {
      memberStatsMap.set(officialName, {
        display: officialName,
        ridesCount: 0,
        totalKm: 0,
        totalElevation: 0,
        groups: { vert: 0, rouge: 0, violet: 0 },
      });
    }
    return memberStatsMap.get(officialName)!;
  };

  // Traiter les participations
  for (const p of monthParticipations) {
    const ride = monthRidesById.get(p.ride_id);
    if (!ride) continue;

    // Comptabiliser le niveau
    if (p.group_level === "vert" || p.group_level === "rouge" || p.group_level === "violet") {
      groupDistribution[p.group_level]++;
    }

    const memberEntry = getOrCreateMember(p.participant_name);
    memberEntry.ridesCount += 1;
    memberEntry.totalKm += ride.distance_km || 0;
    memberEntry.totalElevation += ride.elevation_gain_m || 0;

    totalKmInMonth += ride.distance_km || 0;
    totalElevationInMonth += ride.elevation_gain_m || 0;

    if (p.group_level === "vert" || p.group_level === "rouge" || p.group_level === "violet") {
      memberEntry.groups[p.group_level] += 1;
    }
  }

  // Membres uniques actifs ayant au moins 1 participation ce mois-ci
  const uniqueActiveMembersInMonth = Array.from(memberStatsMap.values()).filter(
    (m) => m.ridesCount > 0
  ).length;

  // Transformer en tableau de statistiques
  const memberStatsList: MonthlyMemberStats[] = Array.from(memberStatsMap.values()).map(
    (entry) => {
      return {
        display: entry.display,
        ridesCount: entry.ridesCount,
        totalKm: Math.round(entry.totalKm * 10) / 10,
        totalElevation: Math.round(entry.totalElevation),
        groups: entry.groups,
      };
    }
  );

  // A. Top Participation / Assiduité (TOP 10) : STRICTEMENT basé sur le nombre de sorties
  const topAttendance = [...memberStatsList]
    .filter((m) => m.ridesCount > 0)
    .sort((a, b) => b.ridesCount - a.ridesCount || a.display.localeCompare(b.display, "fr"))
    .slice(0, 10);

  // B. Top D+ (Grimpeur du mois : TOP 3)
  const topElevation = [...memberStatsList]
    .filter((m) => m.totalElevation > 0)
    .sort((a, b) => b.totalElevation - a.totalElevation || b.ridesCount - a.ridesCount)
    .slice(0, 3);

  // C. Top Distance (Rouleur du mois : TOP 3)
  const topDistance = [...memberStatsList]
    .filter((m) => m.totalKm > 0)
    .sort((a, b) => b.totalKm - a.totalKm || b.ridesCount - a.ridesCount)
    .slice(0, 3);

  return {
    monthKey,
    monthLabel,
    totalRidesInMonth,
    totalParticipationsInMonth,
    uniqueActiveMembersInMonth,
    totalKmInMonth: Math.round(totalKmInMonth),
    totalElevationInMonth: Math.round(totalElevationInMonth),
    topAttendance,
    topElevation,
    topDistance,
    groupDistribution,
  };
}
