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
    const ranking = buildAssiduityRanking(["Thomas Trégaro", "Thomas Tregaro", "Thomas Trégaro"], 10);
    expect(ranking).toEqual([{ display: "Thomas Trégaro", count: 3 }]);
  });

  it("affiche l'orthographe la plus frequente pour une meme personne", () => {
    const ranking = buildAssiduityRanking(["thomas tregaro", "Thomas Trégaro", "Thomas Trégaro"], 10);
    expect(ranking[0]).toEqual({ display: "Thomas Trégaro", count: 3 });
  });

  it("compte une personne comme une seule entree malgre un ordre nom/prenom different", () => {
    const ranking = buildAssiduityRanking(["Thomas Trégaro", "Trégaro Thomas", "Thomas Trégaro"], 10);
    expect(ranking).toEqual([{ display: "Thomas Trégaro", count: 3 }]);
  });

  it("a egalite, garde la premiere orthographe rencontree", () => {
    const ranking = buildAssiduityRanking(["Thomas Tregaro", "Thomas Trégaro"], 10);
    expect(ranking[0].display).toBe("Thomas Tregaro");
  });

  it("trie par nombre de participations decroissant", () => {
    const ranking = buildAssiduityRanking(
      ["Camille", "Thomas", "Camille", "Thomas", "Camille"],
      10
    );
    expect(ranking).toEqual([
      { display: "Camille", count: 3 },
      { display: "Thomas", count: 2 },
    ]);
  });

  it("respecte la limite demandee", () => {
    const ranking = buildAssiduityRanking(["A", "B", "B", "C", "C", "C"], 2);
    expect(ranking).toHaveLength(2);
    expect(ranking.map((r) => r.display)).toEqual(["C", "B"]);
  });

  it("retourne tout le classement quand aucune limite n'est passee", () => {
    const ranking = buildAssiduityRanking(["A", "B", "B", "C", "C", "C"]);
    expect(ranking.map((r) => r.display)).toEqual(["C", "B", "A"]);
  });

  it("ignore les noms vides ou uniquement des espaces", () => {
    const ranking = buildAssiduityRanking(["Thomas", "", "   ", "Thomas"], 10);
    expect(ranking).toEqual([{ display: "Thomas", count: 2 }]);
  });

  it("retourne un tableau vide si aucune participation", () => {
    expect(buildAssiduityRanking([], 10)).toEqual([]);
  });

  it("compte une personne comme une seule entree malgre un emoji ajoute au nom", () => {
    const ranking = buildAssiduityRanking(["Florian Maillou", "Florian Maillou 🚀"], 10);
    expect(ranking).toEqual([{ display: "Florian Maillou", count: 2 }]);
  });

  it("n'affiche jamais d'emoji, meme si c'est la seule orthographe rencontree", () => {
    const ranking = buildAssiduityRanking(["MIMOUNI redouane ✌", "MIMOUNI redouane ✌"], 10);
    expect(ranking).toEqual([{ display: "MIMOUNI redouane", count: 2 }]);
  });
});
