import { describe, expect, it } from "vitest";
import {
  computeMonthlyStats,
  formatMonthLabel,
  getAvailableMonths,
  isRidePast,
} from "@/lib/monthlyStats";
import type { Participation, Ride } from "@/lib/types";

describe("monthlyStats", () => {
  describe("formatMonthLabel", () => {
    it("formats YYYY-MM to Month Year in French", () => {
      expect(formatMonthLabel("2026-11")).toBe("Novembre 2026");
      expect(formatMonthLabel("2026-01")).toBe("Janvier 2026");
      expect(formatMonthLabel("2026-12")).toBe("Décembre 2026");
    });

    it("falls back gracefully on invalid format", () => {
      expect(formatMonthLabel("invalid")).toBe("invalid");
    });
  });

  describe("isRidePast", () => {
    const fixedNow = new Date("2026-11-24T10:30:00");

    it("considère une sortie antérieure comme passée", () => {
      expect(isRidePast({ ride_date: "2026-11-20", ride_time: "09:00:00" }, fixedNow)).toBe(true);
      expect(isRidePast({ ride_date: "2026-10-15" }, fixedNow)).toBe(true);
    });

    it("considère une sortie future comme non passée", () => {
      expect(isRidePast({ ride_date: "2026-11-28", ride_time: "09:00:00" }, fixedNow)).toBe(false);
      expect(isRidePast({ ride_date: "2026-12-19", ride_time: "09:00:00" }, fixedNow)).toBe(false);
    });

    it("prend en compte l'heure pour les sorties du jour même", () => {
      // Départ à 09h00 (passé à 10h30)
      expect(isRidePast({ ride_date: "2026-11-24", ride_time: "09:00:00" }, fixedNow)).toBe(true);
      // Départ à 14h00 (futur à 10h30)
      expect(isRidePast({ ride_date: "2026-11-24", ride_time: "14:00:00" }, fixedNow)).toBe(false);
    });
  });

  describe("getAvailableMonths", () => {
    it("extracts unique months and sorts descending", () => {
      const fixedNow = new Date("2026-11-24T10:30:00");
      const mockRides = [
        { ride_date: "2026-11-01" },
        { ride_date: "2026-11-08" },
        { ride_date: "2026-10-25" },
        { ride_date: "2026-09-15" },
      ] as Ride[];

      const months = getAvailableMonths(mockRides, fixedNow);
      expect(months.length).toBeGreaterThanOrEqual(3);
      expect(months.map((m) => m.key)).toContain("2026-11");
      expect(months.map((m) => m.key)).toContain("2026-10");
      expect(months.map((m) => m.key)).toContain("2026-09");
    });

    it("ne retourne JAMAIS de mois futurs qui dépassent la date actuelle", () => {
      const fixedNow = new Date("2026-11-24T10:30:00");
      const mockRidesWithFuture = [
        { ride_date: "2026-11-01" },
        { ride_date: "2026-11-08" },
        // Sortie de Noël en décembre 2026
        { ride_date: "2026-12-19" },
        // Sortie en janvier 2027
        { ride_date: "2027-01-15" },
      ] as Ride[];

      const months = getAvailableMonths(mockRidesWithFuture, fixedNow);
      const keys = months.map((m) => m.key);

      // Décembre 2026 et Janvier 2027 ne doivent JAMAIS apparaître
      expect(keys).not.toContain("2026-12");
      expect(keys).not.toContain("2027-01");
      // Le mois le plus récent doit être au maximum le mois actuel (Novembre 2026)
      expect(keys[0]).toBe("2026-11");
    });
  });

  describe("computeMonthlyStats", () => {
    const fixedNow = new Date("2026-11-24T10:30:00");
    const mockRides: Ride[] = [
      {
        id: "ride-1",
        title: "Sortie 1",
        description: "Sortie test",
        ride_date: "2026-11-01",
        ride_time: "09:00:00",
        place: "Corum",
        place_url: null,
        distance_km: 70,
        elevation_gain_m: 800,
        strava_url: null,
        show_safety_notice: false,
        gpx_path: null,
        created_by: null,
        created_at: "2026-10-30T10:00:00Z",
        updated_at: "2026-10-30T10:00:00Z",
      },
      {
        id: "ride-2",
        title: "Sortie 2",
        description: "Sortie col",
        ride_date: "2026-11-08",
        ride_time: "08:45:00",
        place: "Corum",
        place_url: null,
        distance_km: 90,
        elevation_gain_m: 1200,
        strava_url: null,
        show_safety_notice: false,
        gpx_path: null,
        created_by: null,
        created_at: "2026-11-05T08:00:00Z",
        updated_at: "2026-11-05T08:00:00Z",
      },
      // Sortie FUTURE dans le mois courant (le 28 novembre alors qu'on est le 24)
      {
        id: "ride-future-nov",
        title: "Sortie fin novembre",
        description: "Pas encore passée",
        ride_date: "2026-11-28",
        ride_time: "09:00:00",
        place: "Corum",
        place_url: null,
        distance_km: 100,
        elevation_gain_m: 1500,
        strava_url: null,
        show_safety_notice: false,
        gpx_path: null,
        created_by: null,
        created_at: "2026-11-20T08:00:00Z",
        updated_at: "2026-11-20T08:00:00Z",
      },
      // Sortie FUTURE en décembre
      {
        id: "ride-noel",
        title: "Sortie de Noël",
        description: "En décembre",
        ride_date: "2026-12-19",
        ride_time: "09:00:00",
        place: "Corum",
        place_url: null,
        distance_km: 60,
        elevation_gain_m: 500,
        strava_url: null,
        show_safety_notice: false,
        gpx_path: null,
        created_by: null,
        created_at: "2026-11-20T08:00:00Z",
        updated_at: "2026-11-20T08:00:00Z",
      },
      {
        id: "ride-oct",
        title: "Sortie Octobre",
        description: "Pas en novembre",
        ride_date: "2026-10-25",
        ride_time: "09:00:00",
        place: "Corum",
        place_url: null,
        distance_km: 50,
        elevation_gain_m: 500,
        strava_url: null,
        show_safety_notice: false,
        gpx_path: null,
        created_by: null,
        created_at: "2026-10-20T10:00:00Z",
        updated_at: "2026-10-20T10:00:00Z",
      },
    ];

    const mockParticipations: Participation[] = [
      // Ride 1 participations
      {
        id: "p1",
        ride_id: "ride-1",
        participant_name: "Aymeric",
        group_level: "violet",
        created_at: "2026-10-30T10:05:00Z",
      },
      {
        id: "p2",
        ride_id: "ride-1",
        participant_name: "Marion",
        group_level: "vert",
        created_at: "2026-10-30T10:30:00Z",
      },
      {
        id: "p3",
        ride_id: "ride-1",
        participant_name: "Thomas",
        group_level: "rouge",
        created_at: "2026-10-30T11:00:00Z",
      },

      // Ride 2 participations
      {
        id: "p4",
        ride_id: "ride-2",
        participant_name: "Aymeric",
        group_level: "violet",
        created_at: "2026-11-05T08:02:00Z",
      },
      {
        id: "p5",
        ride_id: "ride-2",
        participant_name: "Marion",
        group_level: "rouge",
        created_at: "2026-11-05T08:15:00Z",
      },

      // Ride FUTURE du 28 nov (inscriptions faites mais sortie pas encore passée)
      {
        id: "p-fut-1",
        ride_id: "ride-future-nov",
        participant_name: "Aymeric",
        group_level: "violet",
        created_at: "2026-11-21T08:00:00Z",
      },
      {
        id: "p-fut-2",
        ride_id: "ride-future-nov",
        participant_name: "Thomas",
        group_level: "rouge",
        created_at: "2026-11-21T08:30:00Z",
      },

      // Octobre (ignoré pour novembre)
      {
        id: "p6",
        ride_id: "ride-oct",
        participant_name: "Aymeric",
        group_level: "violet",
        created_at: "2026-10-20T11:00:00Z",
      },
    ];

    it("ne comptabilise QUE les sorties passées et exclut les sorties futures du mois", () => {
      const stats = computeMonthlyStats(mockRides, mockParticipations, "2026-11", fixedNow);

      expect(stats.monthKey).toBe("2026-11");
      expect(stats.monthLabel).toBe("Novembre 2026");
      // Seules ride-1 et ride-2 sont passées (ride-future-nov du 28 nov est exclue)
      expect(stats.totalRidesInMonth).toBe(2);
      expect(stats.totalParticipationsInMonth).toBe(5);
      expect(stats.uniqueActiveMembersInMonth).toBe(3); // Aymeric, Marion, Thomas
      expect(stats.groupDistribution.vert).toBe(1);
      expect(stats.groupDistribution.rouge).toBe(2);
      expect(stats.groupDistribution.violet).toBe(2);
      // Distance totale : 70*3 (ride-1) + 90*2 (ride-2) = 210 + 180 = 390 km
      expect(stats.totalKmInMonth).toBe(390);
    });

    it("bloque les requêtes de mois futurs en repliant sur le mois actuel", () => {
      // Si quelqu'un demande décembre 2026 alors qu'on est en novembre 2026
      const stats = computeMonthlyStats(mockRides, mockParticipations, "2026-12", fixedNow);
      expect(stats.monthKey).toBe("2026-11");
      expect(stats.monthLabel).toBe("Novembre 2026");
    });

    it("ranks top attendance with Top 10 strictly based on ridesCount", () => {
      const stats = computeMonthlyStats(mockRides, mockParticipations, "2026-11");

      expect(stats.topAttendance.length).toBe(3);
      // Aymeric and Marion have 2 rides each (ex aequo)
      expect(stats.topAttendance[0].ridesCount).toBe(2);
      expect(stats.topAttendance[1].ridesCount).toBe(2);
      // Thomas has 1 ride
      expect(stats.topAttendance[2].display).toBe("Thomas");
      expect(stats.topAttendance[2].ridesCount).toBe(1);
    });

    it("ranks top elevation (Grimpeur) limited to Top 3", () => {
      const stats = computeMonthlyStats(mockRides, mockParticipations, "2026-11");

      expect(stats.topElevation.length).toBeLessThanOrEqual(3);
      // Aymeric and Marion did both rides (800 + 1200 = 2000m)
      expect(stats.topElevation[0].totalElevation).toBe(2000);
      // Thomas only did ride 1 (800m)
      expect(stats.topElevation.find((m) => m.display === "Thomas")?.totalElevation).toBe(800);
    });

    it("ranks top distance (Rouleur) limited to Top 3", () => {
      const stats = computeMonthlyStats(mockRides, mockParticipations, "2026-11");

      expect(stats.topDistance.length).toBeLessThanOrEqual(3);
      // Aymeric and Marion: 70 + 90 = 160km
      expect(stats.topDistance[0].totalKm).toBe(160);
      expect(stats.topDistance.find((m) => m.display === "Thomas")?.totalKm).toBe(70);
    });
  });
});
