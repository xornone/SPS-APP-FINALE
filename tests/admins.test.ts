import { describe, expect, it } from "vitest";
import { countRegisteredAdmins, isAdminName } from "@/lib/admins";

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

describe("countRegisteredAdmins", () => {
  it("compte uniquement les noms qui correspondent à un admin", () => {
    const names = ["Jean Dupont", "Duc Nguyen", "Margaux Dirat", "Marie Curie"];
    expect(countRegisteredAdmins(names)).toBe(2);
  });

  it("retourne 0 si aucun admin n'est inscrit", () => {
    expect(countRegisteredAdmins(["Jean Dupont", "Marie Curie"])).toBe(0);
  });
});
