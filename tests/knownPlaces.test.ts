import { describe, expect, it } from "vitest";
import { isKnownPlaceUrl, KNOWN_PLACE_LINKS, lookupPlaceUrl } from "@/lib/knownPlaces";

describe("lookupPlaceUrl", () => {
  it("retrouve le lien d'un lieu connu (Marché du Lez)", () => {
    expect(lookupPlaceUrl("Marché du Lez")).toBe("https://maps.app.goo.gl/EJtpGzv1rseboNxy6");
  });

  it("retrouve le lien d'un lieu connu (Corum)", () => {
    expect(lookupPlaceUrl("Corum")).toBe("https://maps.app.goo.gl/TY124riYiLEsRg1k6");
  });

  it("ignore la casse et les espaces en trop", () => {
    expect(lookupPlaceUrl("  corum  ")).toBe(KNOWN_PLACE_LINKS.corum);
    expect(lookupPlaceUrl("MARCHÉ DU LEZ")).toBe(KNOWN_PLACE_LINKS["marché du lez"]);
  });

  it("retourne null pour un lieu inconnu", () => {
    expect(lookupPlaceUrl("Parking de la Mairie, Lattes")).toBeNull();
    expect(lookupPlaceUrl("")).toBeNull();
  });
});

describe("isKnownPlaceUrl", () => {
  it("reconnait un lien present dans la liste des lieux connus", () => {
    expect(isKnownPlaceUrl("https://maps.app.goo.gl/EJtpGzv1rseboNxy6")).toBe(true);
  });

  it("rejette un lien qui n'est pas dans la liste", () => {
    expect(isKnownPlaceUrl("https://maps.google.com/autre-lien")).toBe(false);
    expect(isKnownPlaceUrl("")).toBe(false);
  });
});
