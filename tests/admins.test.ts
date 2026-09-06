import { describe, expect, it } from "vitest";
import { getRegisteredAdmins, isAdminName } from "@/lib/admins";

describe("isAdminName", () => {
  it("reconnaît un nom d'admin quels que soient la casse et les accents", () => {
    expect(isAdminName("Thomas Trégaro")).toBe(true);
    expect(isAdminName("thomas tregaro")).toBe(true);
    expect(isAdminName("THOMAS TRÉGARO")).toBe(true);
    expect(isAdminName("  Tanguy   Delacôte  ")).toBe(true);
    expect(isAdminName("tanguy delacote")).toBe(true);
  });

  it("rejette un nom qui n'est pas dans la liste des admins", () => {
    expect(isAdminName("Jean Dupont")).toBe(false);
    expect(isAdminName("Thomas")).toBe(false);
  });
});

describe("getRegisteredAdmins", () => {
  it("ne garde que les participants qui correspondent à un admin, avec leur groupe", () => {
    const participants = [
      { participant_name: "Jean Dupont", group_level: "vert" as const },
      { participant_name: "Duc Nguyen", group_level: "violet" as const },
      { participant_name: "Margaux Dirat", group_level: "rouge" as const },
      { participant_name: "Marie Curie", group_level: "vert" as const },
    ];
    expect(getRegisteredAdmins(participants)).toEqual([
      { name: "Duc Nguyen", group: "violet" },
      { name: "Margaux Dirat", group: "rouge" },
    ]);
  });

  it("retourne un tableau vide si aucun admin n'est inscrit", () => {
    const participants = [
      { participant_name: "Jean Dupont", group_level: "vert" as const },
      { participant_name: "Marie Curie", group_level: "rouge" as const },
    ];
    expect(getRegisteredAdmins(participants)).toEqual([]);
  });
});
