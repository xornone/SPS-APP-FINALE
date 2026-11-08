import { describe, expect, it } from "vitest";
import {
  extractCaptainFromDescription,
  updateCaptainInDescription,
  getRideCaptain,
  cleanVisibleDescription,
} from "@/lib/captain";

describe("lib/captain", () => {
  it("extracts captain with compass and 'de route'", () => {
    const desc = "Sortie rythmée vers le Pic.\n\n🧭 Capitaine de route : Aymeric Guibert\n\nN'oubliez pas vos bidons.";
    expect(extractCaptainFromDescription(desc)).toBe("Aymeric Guibert");
  });

  it("extracts leader with compass and 'Groupe Leader'", () => {
    const desc = "Sortie rythmée vers le Pic.\n\n🧭 Groupe Leader : Aymeric Guibert\n\nN'oubliez pas vos bidons.";
    expect(extractCaptainFromDescription(desc)).toBe("Aymeric Guibert");
    expect(cleanVisibleDescription(desc)).toBe("Sortie rythmée vers le Pic.\n\nN'oubliez pas vos bidons.");
  });

  it("extracts leader with 'Leader' keyword", () => {
    const desc = "Sortie rythmée.\n\nLeader : Thomas Trégaro";
    expect(extractCaptainFromDescription(desc)).toBe("Thomas Trégaro");
    expect(cleanVisibleDescription(desc)).toBe("Sortie rythmée.");
  });

  it("extracts captain with comment format", () => {
    const desc = "Sortie rythmée vers le Pic.\n\n<!-- captain: Aymeric Guibert -->";
    expect(extractCaptainFromDescription(desc)).toBe("Aymeric Guibert");
  });

  it("cleanVisibleDescription removes captain text completely", () => {
    const desc = "Sortie rythmée vers le Pic.\n\n🧭 Capitaine de route : Aymeric Guibert\n\nN'oubliez pas vos bidons.";
    expect(cleanVisibleDescription(desc)).toBe("Sortie rythmée vers le Pic.\n\nN'oubliez pas vos bidons.");
  });

  it("cleanVisibleDescription removes captain comment completely", () => {
    const desc = "Sortie rythmée vers le Pic.\n\n<!-- captain: Aymeric Guibert -->";
    expect(cleanVisibleDescription(desc)).toBe("Sortie rythmée vers le Pic.");
  });

  it("returns null if no captain present", () => {
    expect(extractCaptainFromDescription("Juste une description classique.")).toBeNull();
    expect(extractCaptainFromDescription("")).toBeNull();
  });

  it("inserts captain as invisible comment and keeps visible text clean", () => {
    const desc = "Départ à 9h.";
    const updated = updateCaptainInDescription(desc, "Thomas Tregaro");
    expect(updated).toContain("<!-- captain: Thomas Tregaro -->");
    expect(cleanVisibleDescription(updated)).toBe("Départ à 9h.");
    expect(extractCaptainFromDescription(updated)).toBe("Thomas Tregaro");
  });

  it("updates existing captain comment", () => {
    const desc = "Départ à 9h.\n\n<!-- captain: Ancien Capitaine -->";
    const updated = updateCaptainInDescription(desc, "Nouveau Capitaine");
    expect(updated).not.toContain("Ancien Capitaine");
    expect(extractCaptainFromDescription(updated)).toBe("Nouveau Capitaine");
    expect(cleanVisibleDescription(updated)).toBe("Départ à 9h.");
  });

  it("removes captain when new captain is empty", () => {
    const desc = "Départ à 9h.\n\n<!-- captain: Thomas -->\n\nFin du parcours.";
    const updated = updateCaptainInDescription(desc, "");
    expect(extractCaptainFromDescription(updated)).toBeNull();
    expect(updated).not.toContain("captain");
  });

  it("getRideCaptain automatically falls back to registered admins when no explicit captain", () => {
    const ride = {
      captain_name: null,
      description: "Sortie classique sans capitaine spécifié.",
    };
    const registeredAdmins = [
      { name: "Thomas Trégaro", group: "rouge" },
      { name: "Duc Nguyen", group: "vert" },
    ];
    expect(getRideCaptain(ride, registeredAdmins)).toBe("Thomas Trégaro, Duc Nguyen");
  });
});
