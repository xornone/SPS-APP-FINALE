import { describe, expect, it } from "vitest";
import { elevationGain, haversineKm, parseGpx, totalDistanceKm } from "@/lib/gpx";

const SAMPLE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <trkseg>
      <trkpt lat="43.6500" lon="3.7500"><ele>60</ele></trkpt>
      <trkpt lat="43.6600" lon="3.7600"><ele>120</ele></trkpt>
      <trkpt lat="43.6700" lon="3.7550"><ele>90</ele></trkpt>
      <trkpt lat="43.6800" lon="3.7650"><ele>200</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

const GPX_NO_ELEVATION = `<?xml version="1.0"?>
<gpx><trk><trkseg>
  <trkpt lat="43.60" lon="3.80"></trkpt>
  <trkpt lat="43.61" lon="3.81"></trkpt>
  <trkpt lat="43.62" lon="3.82"></trkpt>
</trkseg></trk></gpx>`;

const GPX_ROUTE_POINTS = `<?xml version="1.0"?>
<gpx><rte>
  <rtept lat="43.60" lon="3.80"><ele>50</ele></rtept>
  <rtept lat="43.61" lon="3.81"><ele>80</ele></rtept>
</rte></gpx>`;

const INVALID_XML = `not xml at all {{{`;
const EMPTY_GPX = `<?xml version="1.0"?><gpx></gpx>`;

describe("haversineKm", () => {
  it("retourne 0 pour deux points identiques", () => {
    expect(haversineKm(43.6, 3.8, 43.6, 3.8)).toBe(0);
  });

  it("calcule une distance plausible entre deux points connus (~1.3km)", () => {
    // Deux points separes d'environ 0.01 degre de latitude (~1.11km) et
    // un peu de longitude : la distance doit rester dans un ordre de grandeur realiste.
    const d = haversineKm(43.6, 3.8, 43.61, 3.81);
    expect(d).toBeGreaterThan(1);
    expect(d).toBeLessThan(2);
  });
});

describe("totalDistanceKm", () => {
  it("somme les segments consecutifs", () => {
    const points = [
      { lat: 43.6, lon: 3.8 },
      { lat: 43.61, lon: 3.8 },
      { lat: 43.62, lon: 3.8 },
    ];
    const total = totalDistanceKm(points);
    const seg1 = haversineKm(43.6, 3.8, 43.61, 3.8);
    const seg2 = haversineKm(43.61, 3.8, 43.62, 3.8);
    expect(total).toBeCloseTo(seg1 + seg2, 6);
  });

  it("retourne 0 pour un seul point ou aucun point", () => {
    expect(totalDistanceKm([{ lat: 43.6, lon: 3.8 }])).toBe(0);
    expect(totalDistanceKm([])).toBe(0);
  });
});

describe("elevationGain", () => {
  it("ne compte que les montees, jamais les descentes", () => {
    // +60, -30, +110 (retour a 90->200) => gain attendu 60 + 110 = 170
    expect(elevationGain([60, 120, 90, 200])).toBe(170);
  });

  it("retourne 0 sur un profil plat ou descendant", () => {
    expect(elevationGain([200, 190, 180, 170])).toBe(0);
  });
});

describe("parseGpx", () => {
  it("parse les points, la distance et le denivele d'un GPX valide (trkpt)", () => {
    const result = parseGpx(SAMPLE_GPX);
    expect(result).not.toBeNull();
    expect(result!.points).toHaveLength(4);
    expect(result!.points[0]).toEqual([43.65, 3.75]);
    expect(result!.hasRealElevation).toBe(true);
    expect(result!.elevationGainM).toBe(170); // identique au test elevationGain ci-dessus
    expect(result!.distanceKm).toBeGreaterThan(0);
  });

  it("accepte les points de type <rtept> quand il n'y a pas de <trkpt>", () => {
    const result = parseGpx(GPX_ROUTE_POINTS);
    expect(result).not.toBeNull();
    expect(result!.points).toHaveLength(2);
  });

  it("estime un denivele neutre quand le fichier n'a pas d'altitude", () => {
    const result = parseGpx(GPX_NO_ELEVATION);
    expect(result).not.toBeNull();
    expect(result!.hasRealElevation).toBe(false);
    expect(result!.elevationGainM).toBeGreaterThan(0);
  });

  it("retourne null pour un XML invalide", () => {
    expect(parseGpx(INVALID_XML)).toBeNull();
  });

  it("retourne null quand le GPX ne contient aucun point exploitable", () => {
    expect(parseGpx(EMPTY_GPX)).toBeNull();
  });
});
