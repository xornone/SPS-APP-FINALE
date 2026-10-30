import { describe, expect, it } from "vitest";
import { computeScrubAtProgress } from "@/lib/scrub";

describe("computeScrubAtProgress", () => {
  const elevations = [100, 150, 200, 250, 300];
  const points: [number, number][] = [
    [43.6, 3.8],
    [43.61, 3.81],
    [43.62, 3.82],
    [43.63, 3.83],
    [43.64, 3.84],
  ];

  it("calcule les valeurs de début de parcours à progress 0", () => {
    const scrub = computeScrubAtProgress(0, elevations, points, 40, null);
    expect(scrub).not.toBeNull();
    expect(scrub?.distanceKm).toBe(0);
    expect(scrub?.elevationM).toBe(100);
    expect(scrub?.point).toEqual([43.6, 3.8]);
  });

  it("calcule les valeurs à mi-parcours", () => {
    const scrub = computeScrubAtProgress(0.5, elevations, points, 40, null);
    expect(scrub).not.toBeNull();
    expect(scrub?.distanceKm).toBe(20);
    expect(scrub?.elevationM).toBe(200);
    expect(scrub?.point).toEqual([43.62, 3.82]);
  });

  it("calcule les valeurs en fin de parcours", () => {
    const scrub = computeScrubAtProgress(1, elevations, points, 40, null);
    expect(scrub).not.toBeNull();
    expect(scrub?.distanceKm).toBe(40);
    expect(scrub?.elevationM).toBe(300);
    expect(scrub?.point).toEqual([43.64, 3.84]);
  });

  it("retourne null si les élévations sont insuffisantes", () => {
    expect(computeScrubAtProgress(0.5, [100], points, 40, null)).toBeNull();
    expect(computeScrubAtProgress(0.5, null, points, 40, null)).toBeNull();
  });
});
