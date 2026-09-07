import { describe, expect, it } from "vitest";
import { buildGpxFromStreams, extractStravaResource } from "@/lib/strava";
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
