import { describe, expect, it } from "vitest";
import { extractBakeryFromDescription, updateBakeryInDescription } from "@/lib/bakery";

describe("extractBakeryFromDescription", () => {
  it("extrait correctement le nom sans guillemets", () => {
    const text = "Super sortie !\n\n🥐 Arrêt ravito : Boulangerie des Matelles\n\nCasque obligatoire.";
    expect(extractBakeryFromDescription(text)).toBe("Boulangerie des Matelles");
  });

  it("extrait correctement le nom avec guillemets", () => {
    const text = '🥐 Arrêt ravito : "Fournil du Pic"';
    expect(extractBakeryFromDescription(text)).toBe("Fournil du Pic");
  });

  it("extrait correctement le nom avec guillemets français", () => {
    const text = "🥐 Arrêt ravito : « Au Pain Doré »";
    expect(extractBakeryFromDescription(text)).toBe("Au Pain Doré");
  });

  it("renvoie null si aucun arrêt ravito n'est présent", () => {
    expect(extractBakeryFromDescription("Sortie tranquille dimanche")).toBeNull();
    expect(extractBakeryFromDescription("")).toBeNull();
  });
});

describe("updateBakeryInDescription", () => {
  it("ajoute l'arrêt sur une description vide", () => {
    const res = updateBakeryInDescription("", "Boulangerie des Matelles");
    expect(res).toBe("🥐 Arrêt ravito : Boulangerie des Matelles");
  });

  it("ajoute l'arrêt à la fin d'une description existante", () => {
    const initial = "Parcours vallonné de 70 km.";
    const res = updateBakeryInDescription(initial, "Boulangerie des Matelles");
    expect(res).toBe("Parcours vallonné de 70 km.\n\n🥐 Arrêt ravito : Boulangerie des Matelles");
  });

  it("remplace l'arrêt existant sans toucher au reste du texte", () => {
    const initial = "Départ 8h30.\n\n🥐 Arrêt ravito : Ancienne Boulangerie\n\nRetour prévu vers 12h.";
    const res = updateBakeryInDescription(initial, "Nouvelle Boulangerie");
    expect(res).toBe("Départ 8h30.\n\n🥐 Arrêt ravito : Nouvelle Boulangerie\n\nRetour prévu vers 12h.");
  });

  it("supprime l'arrêt existant quand la valeur est vide", () => {
    const initial = "Départ 8h30.\n\n🥐 Arrêt ravito : Boulangerie des Matelles\n\nRetour prévu vers 12h.";
    const res = updateBakeryInDescription(initial, "");
    expect(res).toBe("Départ 8h30.\n\nRetour prévu vers 12h.");
  });

  it("supprime l'arrêt existant situé en fin de texte", () => {
    const initial = "Départ 8h30.\n\n🥐 Arrêt ravito : Boulangerie des Matelles";
    const res = updateBakeryInDescription(initial, "");
    expect(res).toBe("Départ 8h30.");
  });
});
