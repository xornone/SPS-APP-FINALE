import { describe, expect, it } from "vitest";
import { buildAssiduityRanking, normalizeMemberName } from "@/lib/assiduity";

describe("normalizeMemberName", () => {
  it("ignore les accents", () => {
    expect(normalizeMemberName("Thomas Trégaro")).toBe(normalizeMemberName("Thomas Tregaro"));
  });

  it("ignore la casse", () => {
    expect(normalizeMemberName("THOMAS TREGARO")).toBe(normalizeMemberName("thomas tregaro"));
  });

  it("ignore les espaces en trop (avant/apres, ou doubles entre les mots)", () => {
    expect(normalizeMemberName("  Thomas   Tregaro  ")).toBe(normalizeMemberName("Thomas Tregaro"));
  });

  it("ignore l'ordre nom/prenom", () => {
    expect(normalizeMemberName("Thomas Tregaro")).toBe(normalizeMemberName("Tregaro Thomas"));
    expect(normalizeMemberName("Thomas Trégaro")).toBe(normalizeMemberName("TREGARO   thomas"));
  });

  it("ne fusionne pas des noms differents", () => {
    expect(normalizeMemberName("Thomas Tregaro")).not.toBe(normalizeMemberName("Thomas Tregarot"));
    expect(normalizeMemberName("Thomas Tregaro")).not.toBe(normalizeMemberName("Camille Tregaro"));
  });

  it("ignore les emoji ajoutes au nom", () => {
    expect(normalizeMemberName("Florian Maillou 🚀")).toBe(normalizeMemberName("Florian Maillou"));
    expect(normalizeMemberName("Théo DOUSSOT 🚴🏼")).toBe(normalizeMemberName("Théo DOUSSOT"));
    expect(normalizeMemberName("MIMOUNI redouane ✌")).toBe(normalizeMemberName("MIMOUNI redouane"));
  });
});

describe("buildAssiduityRanking", () => {
  it("compte une personne comme une seule entree malgre une orthographe differente (accents)", () => {
    const ranking = buildAssiduityRanking(["Thomas Trégaro", "Thomas Tregaro", "Thomas Trégaro"]);
    expect(ranking[0]).toEqual({ display: "Thomas Trégaro", count: 3 });
    expect(ranking.filter((r) => r.display === "Thomas Trégaro")).toHaveLength(1);
  });

  it("affiche le nom officiel pour une meme personne", () => {
    const ranking = buildAssiduityRanking(["thomas tregaro", "Thomas Trégaro", "Thomas Trégaro"]);
    expect(ranking[0]).toEqual({ display: "Thomas Trégaro", count: 3 });
  });

  it("compte une personne comme une seule entree malgre un ordre nom/prenom different", () => {
    const ranking = buildAssiduityRanking(["Thomas Trégaro", "Trégaro Thomas", "Thomas Trégaro"]);
    expect(ranking[0]).toEqual({ display: "Thomas Trégaro", count: 3 });
  });

  it("trie par nombre de participations decroissant puis par nom alphabetique", () => {
    const ranking = buildAssiduityRanking([
      "Marina Trégaro",
      "Thomas Trégaro",
      "Marina Trégaro",
      "Thomas Trégaro",
      "Marina Trégaro",
    ]);
    expect(ranking.slice(0, 2)).toEqual([
      { display: "Marina Trégaro", count: 3 },
      { display: "Thomas Trégaro", count: 2 },
    ]);
  });

  it("respecte la limite demandee", () => {
    const ranking = buildAssiduityRanking(["Thomas Trégaro"], 5);
    expect(ranking).toHaveLength(5);
    expect(ranking[0]).toEqual({ display: "Thomas Trégaro", count: 1 });
  });

  it("retourne tout le classement des 99 membres quand aucune limite n'est passee", () => {
    const ranking = buildAssiduityRanking(["Thomas Trégaro"]);
    expect(ranking).toHaveLength(99);
    expect(ranking[0]).toEqual({ display: "Thomas Trégaro", count: 1 });
    expect(ranking.find((r) => r.display === "Ben Horny")).toEqual({
      display: "Ben Horny",
      count: 0,
    });
  });

  it("ignore les noms vides ou uniquement des espaces", () => {
    const ranking = buildAssiduityRanking(["Thomas Trégaro", "", "   ", "Thomas Trégaro"]);
    expect(ranking[0]).toEqual({ display: "Thomas Trégaro", count: 2 });
  });

  it("retourne les 99 membres avec 0 sortie si aucune participation", () => {
    const ranking = buildAssiduityRanking([]);
    expect(ranking).toHaveLength(99);
    expect(ranking.every((r) => r.count === 0)).toBe(true);
  });

  it("compte une personne comme une seule entree malgre un emoji ajoute au nom", () => {
    const ranking = buildAssiduityRanking(["Florian Maillou", "Florian Maillou 🚀"]);
    expect(ranking[0]).toEqual({ display: "Florian Maillou", count: 2 });
  });

  it("n'affiche jamais d'emoji et fait correspondre au nom officiel du membre", () => {
    const ranking = buildAssiduityRanking(["MIMOUNI redouane ✌", "MIMOUNI redouane ✌"]);
    expect(ranking[0]).toEqual({ display: "Redouane Mimouni", count: 2 });
  });
});
