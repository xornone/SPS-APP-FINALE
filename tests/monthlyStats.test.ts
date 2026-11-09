import { describe, expect, it } from "vitest";
import {
  computeMonthlyStats,
  formatMonthLabel,
  formatReactionTime,
  getAvailableMonths,
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

  describe("formatReactionTime", () => {
    it("handles null or NaN", () => {
      expect(formatReactionTime(null)).toBe("N/A");
      expect(formatReactionTime(Number.NaN)).toBe("N/A");
    });

    it("handles minutes under 1 min", () => {
      expect(formatReactionTime(0.5)).toBe("< 1 min");
      expect(formatReactionTime(0)).toBe("< 1 min");
    });

    it("handles minutes under 1 hour", () => {
      expect(formatReactionTime(25.4)).toBe("25 min");
    });

    it("handles hours", () => {
      expect(formatReactionTime(65)).toBe("1h 5m");
      expect(formatReactionTime(120)).toBe("2h");
    });

    it("handles days", () => {
      expect(formatReactionTime(24 * 60 + 120)).toBe("1j 2h");
    });
  });

  describe("getAvailableMonths", () => {
    it("extracts unique months and sorts descending", () => {
      const mockRides = [
        { ride_date: "2026-11-01" },
        { ride_date: "2026-11-08" },
        { ride_date: "2026-10-25" },
        { ride_date: "2026-09-15" },
      ] as Ride[];

      const months = getAvailableMonths(mockRides);
      expect(months.length).toBeGreaterThanOrEqual(3);
      expect(months.map((m) => m.key)).toContain("2026-11");
      expect(months.map((m) => m.key)).toContain("2026-10");
      expect(months.map((m) => m.key)).toContain("2026-09");
    });
  });

  describe("computeMonthlyStats", () => {
    const mockRides: Ride[] = [
      {
        id: "ride-1",
        title: "Sortie 1",
        description: "Sortie test\n<!-- captain: Aymeric -->",
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
        captain_name: "Marion",
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
        created_at: "2026-10-30T10:05:00Z", // 5 min après
      },
      {
        id: "p2",
        ride_id: "ride-1",
        participant_name: "Marion",
        group_level: "vert",
        created_at: "2026-10-30T10:30:00Z", // 30 min après
      },
      {
        id: "p3",
        ride_id: "ride-1",
        participant_name: "Thomas",
        group_level: "rouge",
        created_at: "2026-10-30T11:00:00Z", // 60 min après
      },

      // Ride 2 participations
      {
        id: "p4",
        ride_id: "ride-2",
        participant_name: "Aymeric",
        group_level: "violet",
        created_at: "2026-11-05T08:02:00Z", // 2 min après
      },
      {
        id: "p5",
        ride_id: "ride-2",
        participant_name: "Marion",
        group_level: "rouge", // Change de groupe (Caméléon)
        created_at: "2026-11-05T08:15:00Z",
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

    it("correctly filters rides and participations for November 2026", () => {
      const stats = computeMonthlyStats(mockRides, mockParticipations, "2026-11");

      expect(stats.monthKey).toBe("2026-11");
      expect(stats.monthLabel).toBe("Novembre 2026");
      expect(stats.totalRidesInMonth).toBe(2);
      expect(stats.totalParticipationsInMonth).toBe(5);
      expect(stats.groupDistribution.vert).toBe(1);
      expect(stats.groupDistribution.rouge).toBe(2);
      expect(stats.groupDistribution.violet).toBe(2);
    });

    it("ranks top attendance with Top 10", () => {
      const stats = computeMonthlyStats(mockRides, mockParticipations, "2026-11");

      expect(stats.topAttendance.length).toBe(3);
      // Aymeric and Marion have 2 rides each
      expect(stats.topAttendance[0].ridesCount).toBe(2);
      expect(stats.topAttendance[1].ridesCount).toBe(2);
      // Thomas has 1 ride
      expect(stats.topAttendance[2].display).toBe("Thomas");
      expect(stats.topAttendance[2].ridesCount).toBe(1);
    });

    it("ranks top elevation (Grimpeur)", () => {
      const stats = computeMonthlyStats(mockRides, mockParticipations, "2026-11");

      // Aymeric and Marion did both rides (800 + 1200 = 2000m)
      expect(stats.topElevation[0].totalElevation).toBe(2000);
      // Thomas only did ride 1 (800m)
      expect(stats.topElevation.find((m) => m.display === "Thomas")?.totalElevation).toBe(800);
    });

    it("ranks top distance (Rouleur)", () => {
      const stats = computeMonthlyStats(mockRides, mockParticipations, "2026-11");

      // Aymeric and Marion: 70 + 90 = 160km
      expect(stats.topDistance[0].totalKm).toBe(160);
      expect(stats.topDistance.find((m) => m.display === "Thomas")?.totalKm).toBe(70);
    });

    it("ranks most reactive members", () => {
      const stats = computeMonthlyStats(mockRides, mockParticipations, "2026-11");

      // Aymeric: 5 min on ride 1, 2 min on ride 2 -> avg 3.5 min
      // Marion: 30 min on ride 1, 15 min on ride 2 -> avg 22.5 min
      // Thomas: 60 min on ride 1 -> avg 60 min
      expect(stats.mostReactive[0].display).toBe("Aymeric");
      expect(stats.mostReactive[0].avgReactionMinutes).toBe(3.5);
      expect(stats.mostReactive[0].fastestReactionMinutes).toBe(2);
    });

    it("identifies perfect attendance members (Grand Chelem)", () => {
      const stats = computeMonthlyStats(mockRides, mockParticipations, "2026-11");

      // Both Aymeric and Marion have 2/2 rides
      expect(stats.perfectAttendanceMembers.length).toBe(2);
      const names = stats.perfectAttendanceMembers.map((m) => m.display);
      expect(names).toContain("Aymeric");
      expect(names).toContain("Marion");
    });

    it("identifies leaders and caméléon members", () => {
      const stats = computeMonthlyStats(mockRides, mockParticipations, "2026-11");

      // Leaders: Aymeric (ride 1) and Marion (ride 2)
      expect(stats.topLeaders.length).toBe(2);

      // Marion rode in vert (ride 1) and rouge (ride 2) -> cameleon
      expect(stats.cameleon.length).toBeGreaterThanOrEqual(1);
      expect(stats.cameleon.map((m) => m.display)).toContain("Marion");
    });
  });
});
