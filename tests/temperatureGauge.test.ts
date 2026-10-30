import { describe, expect, it } from "vitest";
import { computeTemperatureGaugePosition, SCALE_MAX, SCALE_MIN } from "@/components/TemperatureGauge";

describe("computeTemperatureGaugePosition", () => {
  it("calcule correctement la position pour une plage normale (7° à 17°)", () => {
    const pos = computeTemperatureGaugePosition({ tempMin: 7, tempMax: 17, temperatureC: 8 });
    expect(pos).not.toBeNull();
    expect(pos?.rawMin).toBe(7);
    expect(pos?.rawMax).toBe(17);
    expect(pos?.leftPct).toBe(19);
    expect(pos?.widthPct).toBe(28);
    expect((pos?.leftPct ?? 0) + (pos?.widthPct ?? 0)).toBeLessThanOrEqual(100);
  });

  it("gère une température unique", () => {
    const pos = computeTemperatureGaugePosition({ tempMin: 18, tempMax: 18, temperatureC: 18 });
    expect(pos).not.toBeNull();
    expect(pos?.leftPct).toBe(50);
    expect(pos?.widthPct).toBe(8); // largeur minimale garantie
    expect((pos?.leftPct ?? 0) + (pos?.widthPct ?? 0)).toBeLessThanOrEqual(100);
  });

  it("clamp les valeurs inférieures à SCALE_MIN (0°C)", () => {
    const pos = computeTemperatureGaugePosition({ tempMin: -5, tempMax: 2, temperatureC: -2 });
    expect(pos).not.toBeNull();
    expect(pos?.leftPct).toBe(0);
    expect(pos?.widthPct).toBe(8);
  });

  it("clamp les valeurs supérieures à SCALE_MAX (36°C) sans déborder de 100%", () => {
    const pos = computeTemperatureGaugePosition({ tempMin: 35, tempMax: 40, temperatureC: 38 });
    expect(pos).not.toBeNull();
    expect((pos?.leftPct ?? 0) + (pos?.widthPct ?? 0)).toBe(100);
  });

  it("retourne null si weather est absent", () => {
    expect(computeTemperatureGaugePosition(null)).toBeNull();
    expect(computeTemperatureGaugePosition(undefined)).toBeNull();
  });
});
