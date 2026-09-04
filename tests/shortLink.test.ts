import { describe, expect, it } from "vitest";
import { shortRideCode } from "@/lib/shortLink";

describe("shortRideCode", () => {
  it("retire les tirets et garde 8 caracteres", () => {
    expect(shortRideCode("056e1998-aacd-46f4-8af5-540c352280d1")).toBe("056e1998");
  });

  it("est stable pour un meme id", () => {
    const id = "3f2a9c1e-1111-2222-3333-444455556666";
    expect(shortRideCode(id)).toBe(shortRideCode(id));
  });

  it("produit des codes differents pour des ids differents", () => {
    expect(shortRideCode("aaaaaaaa-0000-0000-0000-000000000000")).not.toBe(
      shortRideCode("bbbbbbbb-0000-0000-0000-000000000000")
    );
  });
});
