import { describe, expect, it } from "vitest";
import type { Participation } from "@/lib/types";

describe("Ordre des participants", () => {
  it("classe les participants par date d'inscription avec le premier inscrit en bas", () => {
    const p1: Participation = {
      id: "p1",
      ride_id: "r1",
      participant_name: "Premier Inscrit",
      group_level: "vert",
      created_at: "2026-11-01T08:00:00Z",
    };
    const p2: Participation = {
      id: "p2",
      ride_id: "r1",
      participant_name: "Deuxième Inscrit",
      group_level: "rouge",
      created_at: "2026-11-01T09:30:00Z",
    };
    const p3: Participation = {
      id: "p3",
      ride_id: "r1",
      participant_name: "Dernier Inscrit",
      group_level: "violet",
      created_at: "2026-11-01T11:00:00Z",
    };

    const input = [p2, p1, p3];

    // Tri : plus récent en haut, premier inscrit en bas (created_at descendant)
    const sorted = [...input].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return timeB - timeA;
    });

    expect(sorted[0].participant_name).toBe("Dernier Inscrit");
    expect(sorted[1].participant_name).toBe("Deuxième Inscrit");
    expect(sorted[2].participant_name).toBe("Premier Inscrit");
  });
});
