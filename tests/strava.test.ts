import { describe, expect, it } from "vitest";
import { buildGpxFromStreams, extractStravaActivityId } from "@/lib/strava";
import { parseGpx } from "@/lib/gpx";

describe("extractStravaActivityId", () => {
  it("extrait l'identifiant depuis un lien d'activite standard", () => {
    expect(extractStravaActivityId("https://www.strava.com/activities/1234567890")).toBe("1234567890");
  });

  it("extrait l'identifiant meme avec des parametres de requete", () => {
    expect(extractStravaActivityId("https://www.strava.com/activities/42?foo=bar")).toBe("42");
  });

  it("retourne null pour un lien qui n'est pas une activite Strava", () => {
    expect(extractStravaActivityId("https://www.strava.com/routes/1234567890")).toBeNull();
    expect(extractStravaActivityId("https://example.com")).toBeNull();
    expect(extractStravaActivityId("")).toBeNull();
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
