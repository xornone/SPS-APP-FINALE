import { describe, expect, it } from "vitest";
import { getMissingAdminGroups, getRegisteredAdmins, getRegisteredCaptains, isAdminName } from "@/lib/admins";
import { isSuperAdmin } from "@/lib/notificationAdmins";

describe("isSuperAdmin", () => {
  it("autorise uniquement l'email de Thomas Trégaro pour les actions super admin", () => {
    expect(isSuperAdmin("th.tregaro@gmail.com")).toBe(true);
    expect(isSuperAdmin("TH.TREGARO@GMAIL.COM")).toBe(true);
    expect(isSuperAdmin("  th.tregaro@gmail.com  ")).toBe(true);
    expect(isSuperAdmin("autre@gmail.com")).toBe(false);
    expect(isSuperAdmin(null)).toBe(false);
    expect(isSuperAdmin(undefined)).toBe(false);
  });
});

describe("isAdminName", () => {
  it("reconnaît un nom d'admin quels que soient la casse et les accents", () => {
    expect(isAdminName("Thomas Trégaro")).toBe(true);
    expect(isAdminName("thomas tregaro")).toBe(true);
    expect(isAdminName("THOMAS TRÉGARO")).toBe(true);
    expect(isAdminName("  Tanguy   Delacôte  ")).toBe(true);
    expect(isAdminName("tanguy delacote")).toBe(true);
    expect(isAdminName("Franck Georges")).toBe(true);
  });

  it("rejette un nom qui n'est pas dans la liste des admins", () => {
    expect(isAdminName("Jean Dupont")).toBe(false);
    expect(isAdminName("Thomas")).toBe(false);
    expect(isAdminName("Margaux Dirat")).toBe(false);
  });
});

describe("getRegisteredAdmins", () => {
  it("ne garde que les participants qui correspondent à un admin, avec leur groupe", () => {
    const participants = [
      { participant_name: "Jean Dupont", group_level: "vert" as const },
      { participant_name: "Duc Nguyen", group_level: "violet" as const },
      { participant_name: "Franck Georges", group_level: "rouge" as const },
      { participant_name: "Marie Curie", group_level: "vert" as const },
    ];
    expect(getRegisteredAdmins(participants)).toEqual([
      { name: "Duc Nguyen", group: "violet" },
      { name: "Franck Georges", group: "rouge" },
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

describe("getRegisteredCaptains", () => {
  it("inclut les admins inscrits ET les capitaines non-admins désignés dans la description", () => {
    const participants = [
      { participant_name: "Thomas Trégaro", group_level: "rouge" as const },
      { participant_name: "Paul Seixas", group_level: "vert" as const },
      { participant_name: "Jean Dupont", group_level: "vert" as const },
    ];
    const desc = "Sortie tranquille.\n\n🧭 Capitaine de route : Paul Seixas";
    const captains = getRegisteredCaptains(participants, desc);
    expect(captains).toEqual([
      { name: "Thomas Trégaro", group: "rouge" },
      { name: "Paul Seixas", group: "vert" },
    ]);
  });
});

describe("getMissingAdminGroups", () => {
  it("retourne les groupes proposés par la sortie sans aucun admin inscrit", () => {
    const registeredAdmins = [
      { name: "Duc Nguyen", group: "violet" as const },
      { name: "Franck Georges", group: "violet" as const },
    ];
    expect(getMissingAdminGroups(["vert", "rouge", "violet"], registeredAdmins)).toEqual(["vert", "rouge"]);
  });

  it("retourne un tableau vide si chaque groupe proposé a au moins un admin", () => {
    const registeredAdmins = [
      { name: "Duc Nguyen", group: "vert" as const },
      { name: "Franck Georges", group: "rouge" as const },
    ];
    expect(getMissingAdminGroups(["vert", "rouge"], registeredAdmins)).toEqual([]);
  });

  it("retourne un tableau vide si la sortie ne propose aucun groupe", () => {
    expect(getMissingAdminGroups([], [])).toEqual([]);
  });
});
