import { describe, expect, it, vi } from "vitest";
import { buildReminderMessage, getTomorrowDateString } from "@/lib/rideReminder";
import type { Ride } from "@/lib/types";

vi.mock("@/lib/weather", () => ({
  getRideCoordinates: () => [43.6, 3.8],
  fetchRideWeather: vi.fn().mockResolvedValue({
    temperatureC: 15,
    suitabilityLabel: "Bonnes conditions",
  }),
}));

describe("lib/rideReminder", () => {
  const mockRide: Ride = {
    id: "ride-123",
    title: "Sortie Rouge — Pic Saint-Loup",
    description: "Belle sortie",
    ride_date: "2026-11-06",
    ride_time: "09:00:00",
    place: "Castelnau",
    place_url: null,
    distance_km: 75,
    elevation_gain_m: 650,
    strava_url: null,
    show_safety_notice: true,
    gpx_path: null,
    created_by: null,
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-01T10:00:00Z",
  };

  it("builds reminder message with departure time, place and weather", async () => {
    const message = await buildReminderMessage(mockRide);
    expect(message.title).toContain("Rappel SPS : Sortie Rouge — Pic Saint-Loup demain 🚴");
    expect(message.body).toContain("Départ 09:00 (Castelnau)");
    expect(message.body).toContain("15°C, Bonnes conditions");
    expect(message.body).toContain("N'oublie pas ton bidon et ta trace GPX !");
    expect(message.url).toBe("/rides/ride-123");
  });

  it("calculates tomorrow's date string format YYYY-MM-DD", () => {
    const tomorrow = getTomorrowDateString();
    expect(tomorrow).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
