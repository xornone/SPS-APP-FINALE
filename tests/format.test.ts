import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  daysUntil,
  fmtDateLong,
  fmtDateShort,
  fmtKm,
  fmtM,
  fmtTime,
  fmtWeekLabel,
  initials,
  isPastDate,
  isWeekend,
  weekKey,
  withinDays,
} from "@/lib/format";

describe("fmtKm / fmtM", () => {
  it("formate les distances avec une virgule et une decimale", () => {
    expect(fmtKm(82)).toBe("82 km");
    expect(fmtKm(41.95)).toBe("42 km");
    expect(fmtKm(35.24)).toBe("35,2 km");
  });

  it("arrondit le denivele a l'entier le plus proche", () => {
    expect(fmtM(849.6)).toBe("850 m");
    expect(fmtM(120)).toBe("120 m");
  });
});

describe("fmtTime", () => {
  it("tronque les secondes d'un temps HH:MM:SS", () => {
    expect(fmtTime("08:30:00")).toBe("08:30");
  });
});

describe("initials", () => {
  it("prend la premiere lettre des deux premiers mots", () => {
    expect(initials("Thomas Trégaro")).toBe("TT");
    expect(initials("Léa Bonnet Dupont")).toBe("LB");
  });

  it("gere un seul mot", () => {
    expect(initials("Thomas")).toBe("T");
  });
});

describe("fmtDateLong / fmtDateShort", () => {
  it("formate une date ISO en francais", () => {
    // 2026-09-06 est un dimanche
    expect(fmtDateLong("2026-09-06")).toBe("dimanche 6 septembre");
    expect(fmtDateShort("2026-09-06")).toBe("DIM 6 SEPT");
  });
});

describe("fonctions dependantes de la date du jour", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 4)); // vendredi 4 septembre 2026
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("isPastDate distingue passe et futur", () => {
    expect(isPastDate("2026-09-01")).toBe(true);
    expect(isPastDate("2026-09-04")).toBe(false); // aujourd'hui n'est pas "passe"
    expect(isPastDate("2026-09-05")).toBe(false);
  });

  it("daysUntil calcule le nombre de jours restants", () => {
    expect(daysUntil("2026-09-04")).toBe(0);
    expect(daysUntil("2026-09-06")).toBe(2);
  });

  it("withinDays respecte la fenetre demandee", () => {
    expect(withinDays("2026-09-06", 7)).toBe(true); // dans 2 jours
    expect(withinDays("2026-09-20", 7)).toBe(false); // dans 16 jours
    expect(withinDays("2026-09-01", 7)).toBe(false); // deja passe
  });

  it("isWeekend detecte samedi et dimanche", () => {
    expect(isWeekend("2026-09-05")).toBe(true); // samedi
    expect(isWeekend("2026-09-06")).toBe(true); // dimanche
    expect(isWeekend("2026-09-09")).toBe(false); // mercredi
  });

  it("weekKey regroupe les dates d'une meme semaine lundi -> dimanche", () => {
    // La semaine du vendredi 4 septembre 2026 va du lundi 31 aout au dimanche 6 sept.
    expect(weekKey("2026-09-01")).toBe("2026-08-31");
    expect(weekKey("2026-09-04")).toBe("2026-08-31");
    expect(weekKey("2026-09-06")).toBe("2026-08-31");
    expect(weekKey("2026-09-07")).toBe("2026-09-07"); // semaine suivante
  });

  it("fmtWeekLabel affiche la plage lundi -> dimanche, meme a cheval sur deux mois", () => {
    expect(fmtWeekLabel("2026-09-08")).toBe("7 – 13 septembre"); // meme mois
    expect(fmtWeekLabel("2026-09-04")).toBe("Cette semaine · 31 août. – 6 sept."); // semaine en cours, a cheval
  });
});
