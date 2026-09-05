import { describe, expect, it } from "vitest";
import { haversineKm } from "@/lib/gpx";
import { describeRideProfile, detectClimbs, resampleProfile } from "@/lib/rideProfile";

/**
 * Construit une trace synthetique en ligne droite (latitude variable,
 * longitude fixe) avec un profil altimetrique donne par des points cles
 * (km, altitude) relies lineairement. La distance cumulee reelle est
 * recalculee via haversineKm (comme le ferait le code de production) afin
 * que les altitudes assignees correspondent exactement aux km voulus,
 * independamment de l'imprecision de la conversion degre -> metres.
 */
function buildTrack(keyframes: [number, number][], stepM = 25) {
  const totalKm = keyframes[keyframes.length - 1][0];
  const stepDeg = stepM / 111320;
  const n = Math.round((totalKm * 1000) / stepM) + 1;
  const points: [number, number][] = [];
  for (let i = 0; i < n; i++) points.push([43.6 + i * stepDeg, 3.8]);

  const cum = [0];
  for (let i = 1; i < n; i++) {
    cum.push(cum[i - 1] + haversineKm(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]));
  }

  function eleAt(km: number): number {
    for (let i = 1; i < keyframes.length; i++) {
      const [k0, e0] = keyframes[i - 1];
      const [k1, e1] = keyframes[i];
      if (km <= k1) {
        const t = k1 > k0 ? (km - k0) / (k1 - k0) : 0;
        return e0 + (e1 - e0) * t;
      }
    }
    return keyframes[keyframes.length - 1][1];
  }

  const elevations = cum.map(eleAt);
  return { points, elevations, distanceKm: cum[cum.length - 1] };
}

describe("resampleProfile", () => {
  it("reechantillonne sur une grille reguliere et conserve les valeurs extremes", () => {
    const { points, elevations } = buildTrack([
      [0, 100],
      [10, 300],
    ]);
    const { distKm, ele } = resampleProfile(points, elevations, 100);
    expect(distKm[0]).toBe(0);
    expect(ele[0]).toBeCloseTo(100, 0);
    expect(ele[ele.length - 1]).toBeCloseTo(300, 0);
    // Grille reguliere tous les 100m = 0.1km.
    expect(distKm[1] - distKm[0]).toBeCloseTo(0.1, 5);
  });

  it("retourne un profil vide s'il n'y a pas assez de points", () => {
    expect(resampleProfile([[43.6, 3.8]], [100])).toEqual({ distKm: [], ele: [] });
  });
});

describe("detectClimbs", () => {
  it("ne detecte aucune montee sur un profil plat (bruit sous le seuil)", () => {
    const { points, elevations } = buildTrack([
      [0, 200],
      [5, 204],
      [10, 198],
      [15, 201],
    ]);
    expect(detectClimbs(points, elevations)).toEqual([]);
  });

  it("detecte une montee unique avec un plat avant et apres (le plat n'est pas compte dans la montee)", () => {
    // Plat 0-5km @150m, montee 5-11km jusqu'a 378m (+228m sur 6km = 3.8%), plat 11-20km.
    const { points, elevations } = buildTrack([
      [0, 150],
      [5, 150],
      [11, 378],
      [20, 378],
    ]);
    const climbs = detectClimbs(points, elevations);
    expect(climbs).toHaveLength(1);
    // Le lissage/reechantillonnage introduit une marge d'environ 0.5km sur
    // les bords : on verifie un ordre de grandeur plausible, pas une valeur
    // exacte (l'objectif est une description parlante, pas une mesure
    // scientifique).
    expect(climbs[0].startKm).toBeGreaterThan(4);
    expect(climbs[0].startKm).toBeLessThan(6);
    expect(climbs[0].lengthKm).toBeGreaterThan(5);
    expect(climbs[0].lengthKm).toBeLessThan(7.5);
    expect(climbs[0].elevationGainM).toBeGreaterThan(200);
    expect(climbs[0].elevationGainM).toBeLessThan(250);
    expect(climbs[0].avgGradientPct).toBeGreaterThan(3);
    expect(climbs[0].avgGradientPct).toBeLessThan(4.5);
  });

  it("detecte plusieurs montees distinctes separees par une descente", () => {
    const { points, elevations } = buildTrack([
      [0, 100],
      [3, 250], // montee 1 : 3km, +150m (~5%)
      [6, 100], // descente
      [6.5, 100],
      [8, 200], // montee 2, plus courte et plus raide : 1.5km, +100m (~6.7%)
      [12, 200],
    ]);
    const climbs = detectClimbs(points, elevations);
    expect(climbs.length).toBeGreaterThanOrEqual(2);
    const starts = climbs.map((c) => Math.round(c.startKm)).sort((a, b) => a - b);
    expect(starts[0]).toBeCloseTo(0, 0);
    expect(starts[1]).toBeGreaterThanOrEqual(6);
  });

  it("ignore les montees trop courtes et trop peu pentues", () => {
    // +15m sur 2km = 0.75% : ni assez long+pentu, ni assez court+raide.
    const { points, elevations } = buildTrack([
      [0, 100],
      [2, 115],
      [4, 100],
    ]);
    expect(detectClimbs(points, elevations)).toEqual([]);
  });

  it("retient une courte bosse raide meme si elle est breve", () => {
    // +45m sur 400m = 11.25% : court mais tres raide.
    const { points, elevations } = buildTrack([
      [0, 100],
      [3, 100],
      [3.4, 145],
      [6, 145],
    ]);
    const climbs = detectClimbs(points, elevations);
    expect(climbs.length).toBeGreaterThanOrEqual(1);
    // Une bosse tres courte (400m) est en partie attenuee par le lissage
    // (300m) : on verifie qu'elle reste nettement au-dessus du seuil de
    // detection des courtes bosses raides (4%), pas sa pente exacte.
    expect(climbs[0].avgGradientPct).toBeGreaterThan(5);
  });
});

describe("describeRideProfile", () => {
  it("decrit un parcours plat sans montee notable", () => {
    const { points, elevations, distanceKm } = buildTrack([
      [0, 100],
      [20, 104],
      [40, 100],
    ]);
    const text = describeRideProfile({ points, elevations, distanceKm, elevationGainM: 20, hasRealElevation: true });
    expect(text).toContain("40 km");
    expect(text.toLowerCase()).toContain("plat");
  });

  it("decrit un parcours avec une montee, en mentionnant longueur, pente et position", () => {
    const { points, elevations, distanceKm } = buildTrack([
      [0, 150],
      [5, 150],
      [11, 378],
      [20, 378],
    ]);
    const text = describeRideProfile({
      points,
      elevations,
      distanceKm,
      elevationGainM: 228,
      hasRealElevation: true,
    });
    expect(text).toContain("20 km");
    expect(text).toContain("228 m");
    expect(text).toMatch(/\d,\d km à \d,\d% de moyenne/);
    expect(text).toContain("vers le km 5");
  });

  it("reste sobre quand le GPX n'a pas d'altitude reelle (estimee)", () => {
    const { points, elevations, distanceKm } = buildTrack([
      [0, 100],
      [10, 100],
    ]);
    const text = describeRideProfile({ points, elevations, distanceKm, elevationGainM: 120, hasRealElevation: false });
    expect(text).toContain("10 km");
    expect(text).not.toContain("montée");
    expect(text).not.toContain("km 0");
  });
});
