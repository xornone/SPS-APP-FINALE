import { describe, expect, it, vi } from "vitest";
import {
  buildGpxFromStreams,
  extractStravaResource,
  fetchStravaActivityMetadata,
  fetchStravaRouteMetadata,
} from "@/lib/strava";
import { parseGpx } from "@/lib/gpx";

describe("extractStravaResource", () => {
  it("reconnait une activite", () => {
    expect(extractStravaResource("https://www.strava.com/activities/1234567890")).toEqual({
      type: "activity",
      id: "1234567890",
    });
  });

  it("reconnait une route (parcours planifie)", () => {
    expect(extractStravaResource("https://www.strava.com/routes/3474411250197770348")).toEqual({
      type: "route",
      id: "3474411250197770348",
    });
  });

  it("fonctionne meme avec des parametres de requete", () => {
    expect(extractStravaResource("https://www.strava.com/activities/42?foo=bar")).toEqual({
      type: "activity",
      id: "42",
    });
    expect(extractStravaResource("https://www.strava.com/routes/42?foo=bar")).toEqual({
      type: "route",
      id: "42",
    });
  });

  it("retourne null pour un lien qui n'est ni une activite ni une route", () => {
    expect(extractStravaResource("https://www.strava.com/segments/1234567890")).toBeNull();
    expect(extractStravaResource("https://example.com")).toBeNull();
    expect(extractStravaResource("")).toBeNull();
  });
});

describe("buildGpxFromStreams", () => {
  it("construit un GPX exploitable par parseGpx a partir des streams Strava", () => {
    const gpx = buildGpxFromStreams(
      {
        latlng: {
          data: [
            [43.65, 3.75],
            [43.66, 3.76],
            [43.67, 3.755],
          ],
        },
        altitude: { data: [60, 120, 90] },
      },
      "Sortie SPS — activité Strava 123"
    );

    const parsed = parseGpx(gpx);
    expect(parsed).not.toBeNull();
    expect(parsed?.points.length).toBe(3);
    expect(parsed?.hasRealElevation).toBe(true);
  });

  it("leve une erreur si la trace GPS est vide ou trop courte", () => {
    expect(() => buildGpxFromStreams({ latlng: { data: [] } }, "test")).toThrow();
    expect(() => buildGpxFromStreams({}, "test")).toThrow();
  });
});

describe("fetchStravaRouteMetadata & fetchStravaActivityMetadata", () => {
  it("extrait fidèlement la distance et le D+ officiel d'une route Strava", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 3556675818888622208,
        name: "Violet 22/11",
        distance: 82540.2, // ~82.5 km
        elevation_gain: 923.4, // 923 m D+
      }),
    } as any);

    try {
      const meta = await fetchStravaRouteMetadata("fake_token", "3556675818888622208");
      expect(meta.distanceKm).toBe(82.5);
      expect(meta.elevationGainM).toBe(923);
      expect(meta.name).toBe("Violet 22/11");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("extrait fidèlement la distance et le D+ officiel d'une activité Strava", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 12345678,
        name: "Sortie du dimanche",
        distance: 72930.0, // ~72.9 km
        total_elevation_gain: 747.8, // 748 m D+
      }),
    } as any);

    try {
      const meta = await fetchStravaActivityMetadata("fake_token", "12345678");
      expect(meta.distanceKm).toBe(72.9);
      expect(meta.elevationGainM).toBe(748);
      expect(meta.name).toBe("Sortie du dimanche");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
