import { describe, it, expect } from "vitest";
import {
  getCanonicalVoterKey,
  getCanonicalDisplayName,
  isSameVoter,
} from "../lib/voterCanonical";

describe("Voter Canonical Identity Reconciliation", () => {
  it("matches inversions and accents for Thomas Trégaro", () => {
    expect(isSameVoter("Thomas Trégaro", "Trégaro Thomas")).toBe(true);
    expect(isSameVoter("Thomas Trégaro", "Thomas Tregaro")).toBe(true);
    expect(isSameVoter("Thomas Trégaro", "tregaro thomas")).toBe(true);
    expect(isSameVoter("Thomas Trégaro", "THOMAS TREGARO")).toBe(true);
    expect(isSameVoter("Thomas Trégaro", "Thomas   Trégaro ")).toBe(true);
  });

  it("does not match different people with same last name", () => {
    expect(isSameVoter("Thomas Trégaro", "Marina Trégaro")).toBe(false);
  });

  it("matches known SPS aliases", () => {
    expect(isSameVoter("Charly", "Charly Jegat")).toBe(true);
    expect(isSameVoter("Charly J", "Charly Jegat")).toBe(true);
    expect(isSameVoter("duc nguyen", "Huu Duc Nguyen")).toBe(true);
    expect(isSameVoter("jb lafon", "Jean-Baptiste Lafon")).toBe(true);
    expect(isSameVoter("fred tt", "Frederic Tardivot (Fred)")).toBe(true);
  });

  it("matches non-official member variations", () => {
    expect(isSameVoter("Pierre Dupont", "Dupont Pierre")).toBe(true);
    expect(isSameVoter("Piérre Dùpont", "Pierre Dupont")).toBe(true);
    expect(isSameVoter("Pierre Dupont", "Marie Dupont")).toBe(false);
  });

  it("returns official clean display name when known", () => {
    expect(getCanonicalDisplayName("tregaro thomas")).toBe("Thomas Trégaro");
    expect(getCanonicalDisplayName("charly")).toBe("Charly Jegat");
    expect(getCanonicalDisplayName("Jean Dupont")).toBe("Jean Dupont");
  });
});
