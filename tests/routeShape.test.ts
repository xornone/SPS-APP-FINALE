import { describe, expect, it } from "vitest";
import { buildRoutePath } from "@/lib/routeShape";

describe("buildRoutePath", () => {
  it("renvoie une chaine vide sans points", () => {
    expect(buildRoutePath([], 100, 100)).toBe("");
  });

  it("commence par M et relie les points avec L", () => {
    const path = buildRoutePath(
      [
        [43.6, 3.8],
        [43.61, 3.82],
        [43.62, 3.81],
      ],
      200,
      100
    );
    expect(path.startsWith("M ")).toBe(true);
    expect(path.split(" L ").length).toBe(3);
  });

  it("centre le trace verticalement pour une ligne purement horizontale", () => {
    const points: [number, number][] = [
      [43.6, 3.8],
      [43.6, 3.9],
    ];
    const path = buildRoutePath(points, 200, 100);
    const coords = path
      .replace("M ", "")
      .split(" L ")
      .map((p) => p.split(",").map(Number));
    expect(coords[0][1]).toBeCloseTo(coords[1][1], 5);
  });

  it("gere un trace reduit a un seul point sans lever d'erreur", () => {
    const path = buildRoutePath([[43.6, 3.8]], 200, 100);
    expect(path.startsWith("M ")).toBe(true);
  });
});
