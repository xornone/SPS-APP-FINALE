import { describe, expect, it, vi } from "vitest";
import { buildReminderMessage, formatReminderWeather, getTomorrowDateString } from "@/lib/rideReminder";
import type { Ride } from "@/lib/types";
import type { RideWeather } from "@/lib/weather";

vi.mock("@/lib/weather", () => ({
  getRideCoordinates: () => [43.6, 3.8],
  fetchRideWeather: vi.fn().mockResolvedValue({
    temperatureC: 15,
    weatherCode: 0,
    dominantWeatherCode: 0,
    precipitationProbability: 0,
    maxPrecipitationProbability: 0,
    windSpeedKmh: 10,
    windDirectionDeg: 180,
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

  describe("formatReminderWeather", () => {
    it("formats clear sky with sun emoji", () => {
      const weather: RideWeather = {
        temperatureC: 18.2,
        weatherCode: 0,
        precipitationProbability: 0,
        windSpeedKmh: 10,
        windDirectionDeg: 180,
      };
      expect(formatReminderWeather(weather)).toBe("18°C, ☀️ Ciel dégagé");
    });

    it("formats overcast sky", () => {
      const weather: RideWeather = {
        temperatureC: 12.6,
        weatherCode: 3,
        precipitationProbability: 10,
        windSpeedKmh: 15,
        windDirectionDeg: 200,
      };
      expect(formatReminderWeather(weather)).toBe("13°C, 🌥️ Ciel couvert");
    });

    it("formats rain with percentage risk", () => {
      const weather: RideWeather = {
        temperatureC: 11.1,
        weatherCode: 61,
        precipitationProbability: 70,
        maxPrecipitationProbability: 70,
        windSpeedKmh: 20,
        windDirectionDeg: 220,
      };
      expect(formatReminderWeather(weather)).toBe("11°C, 🌧️ Pluie (70% de risque)");
    });
  });

  describe("buildReminderMessage", () => {
    it("builds reminder message with departure time, place and accurate weather without accessories", async () => {
      const message = await buildReminderMessage(mockRide);
      expect(message.title).toBe("Rappel SPS : Sortie Rouge — Pic Saint-Loup demain 🚴");
      expect(message.body).toBe("Départ 09:00 (Castelnau) · 15°C, ☀️ Ciel dégagé");
      expect(message.body).not.toContain("bidon");
      expect(message.body).not.toContain("GPX");
      expect(message.type).toBe("ride_reminder");
      expect(message.rideId).toBe("ride-123");
      expect(message.url).toBe("/rides/ride-123");
    });
  });

  it("calculates tomorrow's date string format YYYY-MM-DD", () => {
    const tomorrow = getTomorrowDateString();
    expect(tomorrow).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
