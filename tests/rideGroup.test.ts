import { describe, expect, it } from "vitest";
import { detectRideGroup } from "@/lib/rideGroup";

describe("detectRideGroup", () => {
  it("detects rouge from title with text and emoji", () => {
    expect(detectRideGroup({ title: "🔴 Groupe Rouge - Saint Martin de Londres" })).toBe("rouge");
  });

  it("detects vert from title with text and emoji", () => {
    expect(detectRideGroup({ title: "🟢 Groupe Vert - Cazevieille" })).toBe("vert");
  });

  it("detects violet from title with text and emoji", () => {
    expect(detectRideGroup({ title: "🟣 Groupe Violet - Causse de la Selle" })).toBe("violet");
  });

  it("detects group from text keywords without emoji", () => {
    expect(detectRideGroup({ title: "Groupe Rouge - Valflaunès" })).toBe("rouge");
    expect(detectRideGroup({ title: "Groupe Vert - Claret" })).toBe("vert");
    expect(detectRideGroup({ title: "Groupe Violet - Saint Guilhem" })).toBe("violet");
    expect(detectRideGroup({ title: "Sortie Verte du dimanche" })).toBe("vert");
    expect(detectRideGroup({ title: "Sortie Violette du samedi" })).toBe("violet");
  });

  it("prioritizes written text over emoji if they conflict", () => {
    // Le texte doit prévaloir
    expect(detectRideGroup({ title: "🔴 Groupe Vert - Cazevieille" })).toBe("vert");
    expect(detectRideGroup({ title: "🟢 Groupe Rouge - Saint Martin" })).toBe("rouge");
    expect(detectRideGroup({ title: "🟣 Groupe Rouge - Valflaunès" })).toBe("rouge");
  });

  it("detects from emoji if no group word is written", () => {
    expect(detectRideGroup({ title: "🔴 Saint Martin de Londres" })).toBe("rouge");
    expect(detectRideGroup({ title: "🟢 Cazevieille" })).toBe("vert");
    expect(detectRideGroup({ title: "🟣 Causse de la Selle" })).toBe("violet");
  });

  it("returns null for ambiguous titles mentioning multiple groups", () => {
    expect(detectRideGroup({ title: "Sortie Rouge & Vert" })).toBeNull();
  });

  it("does not tint generic titles even if a single ride_group is in DB (text must prevail)", () => {
    expect(
      detectRideGroup({
        title: "Reconnaissance parcours",
        ride_groups: [{ group_level: "vert" }],
      })
    ).toBeNull();
    expect(
      detectRideGroup({
        title: "Sortie Club Dimanche",
        ride_groups: [
          { group_level: "vert" },
          { group_level: "rouge" },
          { group_level: "violet" },
        ],
      })
    ).toBeNull();
  });

  it("does not false-positive on words containing 'vert' like 'ouvert' or 'couvert'", () => {
    expect(
      detectRideGroup({
        title: "Grand parcours ouvert à tous",
        ride_groups: [
          { group_level: "vert" },
          { group_level: "rouge" },
        ],
      })
    ).toBeNull();
  });
});
