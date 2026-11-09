import { describe, expect, it } from "vitest";
import { isPreorderOpenToPublic, PREORDER_OPEN_DATE } from "@/lib/preorder";

describe("lib/preorder", () => {
  it("targets Tuesday 10 November 2026 at 21:00:00 (Paris time)", () => {
    // 2026-11-10T21:00:00+01:00 is 20:00:00 UTC
    expect(PREORDER_OPEN_DATE.toISOString()).toBe("2026-11-10T20:00:00.000Z");
  });

  it("returns false before 21:00:00 on November 10, 2026", () => {
    // 20:59:59 Paris time (19:59:59 UTC)
    const beforeDate = new Date("2026-11-10T20:59:59+01:00").getTime();
    expect(isPreorderOpenToPublic(beforeDate)).toBe(false);

    // Current time (November 9)
    const now = new Date("2026-11-09T11:30:00+01:00").getTime();
    expect(isPreorderOpenToPublic(now)).toBe(false);
  });

  it("returns true starting exactly at 21:00:00 on November 10, 2026", () => {
    // Exactly 21:00:00 Paris time
    const openDate = new Date("2026-11-10T21:00:00+01:00").getTime();
    expect(isPreorderOpenToPublic(openDate)).toBe(true);

    // After 21:00:00 Paris time
    const afterDate = new Date("2026-11-10T21:00:01+01:00").getTime();
    expect(isPreorderOpenToPublic(afterDate)).toBe(true);
  });
});
