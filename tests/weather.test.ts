import { describe, expect, it } from "vitest";
import {
  addMinutesToTimeString,
  computeSuitabilityScore,
  estimateRideDurationMinutes,
  fmtWeatherTempRange,
  formatDuration,
  getWeatherEmoji,
  interpolateWeatherAtProgress,
  weatherCodeInfo,
  type RideWeather,
  type RideWeatherHour,
} from "@/lib/weather";

describe("estimateRideDurationMinutes", () => {
  it("estime la durée pour le groupe vert avec du D+", () => {
    // 67 km, 700m D+, groupe vert
    const duration = estimateRideDurationMinutes(67, 700, ["vert"]);
    // ~160-170 min (environ 2h45)
    expect(duration).toBeGreaterThanOrEqual(150);
    expect(duration).toBeLessThanOrEqual(180);
  });

  it("estime une durée plus courte pour le groupe violet à distance égale", () => {
    const durationVert = estimateRideDurationMinutes(80, 500, ["vert"]);
    const durationViolet = estimateRideDurationMinutes(80, 500, ["violet"]);
    expect(durationViolet).toBeLessThan(durationVert);
  });

  it("utilise une valeur de repli si la distance est nulle ou absente", () => {
    expect(estimateRideDurationMinutes(0, 0, [])).toBe(120);
    expect(estimateRideDurationMinutes(undefined, undefined, undefined)).toBe(120);
  });
});

describe("formatDuration and addMinutesToTimeString", () => {
  it("formate correctement les heures et minutes", () => {
    expect(formatDuration(165)).toBe("2h45");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(45)).toBe("45min");
  });

  it("calcule l'heure d'arrivée estimée", () => {
    expect(addMinutesToTimeString("09:00:00", 165)).toBe("11:45");
    expect(addMinutesToTimeString("08:45", 195)).toBe("12:00");
  });
});

describe("computeSuitabilityScore", () => {
  it("attribue une excellente note pour des conditions idéales", () => {
    const slots: RideWeatherHour[] = [
      { hour: 9, time: "09:00", temperatureC: 14, precipitationProbability: 0, windSpeedKmh: 6, windDirectionDeg: 0, weatherCode: 0 },
      { hour: 10, time: "10:00", temperatureC: 17, precipitationProbability: 0, windSpeedKmh: 8, windDirectionDeg: 0, weatherCode: 0 },
      { hour: 11, time: "11:00", temperatureC: 19, precipitationProbability: 5, windSpeedKmh: 9, windDirectionDeg: 0, weatherCode: 1 },
    ];
    const result = computeSuitabilityScore(slots);
    expect(result.score).toBeGreaterThanOrEqual(9.0);
    expect(result.badgeColor).toMatch(/emerald|green/);
    expect(result.label).toMatch(/idéales|Excellentes/);
  });

  it("génère un résumé sans doublon pour la pluie et le vent", () => {
    const slots: RideWeatherHour[] = [
      { hour: 9, time: "09:00", temperatureC: 15, precipitationProbability: 0, windSpeedKmh: 8, windDirectionDeg: 0, weatherCode: 0 },
      { hour: 10, time: "10:00", temperatureC: 18, precipitationProbability: 0, windSpeedKmh: 10, windDirectionDeg: 0, weatherCode: 0 },
    ];
    const result = computeSuitabilityScore(slots);
    const rainOccurrences = (result.summary.match(/zéro pluie/g) || []).length;
    const windOccurrences = (result.summary.match(/vent très calme/g) || []).length;
    expect(rainOccurrences).toBe(1);
    expect(windOccurrences).toBe(1);
  });

  it("pénalise la note en cas de pluie ou vent fort", () => {
    const slots: RideWeatherHour[] = [
      { hour: 9, time: "09:00", temperatureC: 8, precipitationProbability: 70, windSpeedKmh: 35, windDirectionDeg: 0, weatherCode: 63 },
      { hour: 10, time: "10:00", temperatureC: 9, precipitationProbability: 85, windSpeedKmh: 42, windDirectionDeg: 0, weatherCode: 65 },
    ];
    const result = computeSuitabilityScore(slots);
    expect(result.score).toBeLessThan(5.0);
    expect(result.badgeColor).toMatch(/orange|rose/);
  });

  it("pénalise la canicule ou le grand froid", () => {
    const freezingSlots: RideWeatherHour[] = [
      { hour: 9, time: "09:00", temperatureC: -2, precipitationProbability: 0, windSpeedKmh: 10, windDirectionDeg: 0, weatherCode: 0 },
    ];
    expect(computeSuitabilityScore(freezingSlots).score).toBeLessThanOrEqual(6.0);

    const heatwaveSlots: RideWeatherHour[] = [
      { hour: 13, time: "13:00", temperatureC: 37, precipitationProbability: 0, windSpeedKmh: 10, windDirectionDeg: 0, weatherCode: 0 },
    ];
    expect(computeSuitabilityScore(heatwaveSlots).score).toBeLessThanOrEqual(6.0);
  });

  it("notifie 'Frais au départ' pour une matinée fraîche (7° à 17° ou 9° à 16°)", () => {
    const slots: RideWeatherHour[] = [
      { hour: 9, time: "09:00", temperatureC: 9, precipitationProbability: 0, windSpeedKmh: 4, windDirectionDeg: 0, weatherCode: 0 },
      { hour: 10, time: "10:00", temperatureC: 13, precipitationProbability: 0, windSpeedKmh: 3, windDirectionDeg: 0, weatherCode: 0 },
      { hour: 11, time: "11:00", temperatureC: 15, precipitationProbability: 0, windSpeedKmh: 2, windDirectionDeg: 0, weatherCode: 0 },
      { hour: 12, time: "12:00", temperatureC: 16, precipitationProbability: 0, windSpeedKmh: 4, windDirectionDeg: 0, weatherCode: 0 },
    ];
    const res = computeSuitabilityScore(slots);
    expect(res.label).toBe("Frais au départ");
    expect(res.score).toBeLessThanOrEqual(8.0); // recalibré sous 8.0 pour un départ à 9°C
    expect(res.score).toBeGreaterThanOrEqual(7.0);
  });

  it("notifie 'Chaud' à partir de 30°C", () => {
    const slots: RideWeatherHour[] = [
      { hour: 11, time: "11:00", temperatureC: 25, precipitationProbability: 0, windSpeedKmh: 10, windDirectionDeg: 0, weatherCode: 0 },
      { hour: 12, time: "12:00", temperatureC: 30, precipitationProbability: 0, windSpeedKmh: 10, windDirectionDeg: 0, weatherCode: 0 },
      { hour: 13, time: "13:00", temperatureC: 31, precipitationProbability: 0, windSpeedKmh: 12, windDirectionDeg: 0, weatherCode: 0 },
    ];
    const res = computeSuitabilityScore(slots);
    expect(res.label).toBe("Chaud");
    expect(res.badgeColor).toBe("amber");
  });

  it("considère 27°C comme une température ok (sans alerte de chaleur)", () => {
    const slots: RideWeatherHour[] = [
      { hour: 9, time: "09:00", temperatureC: 18, precipitationProbability: 0, windSpeedKmh: 8, windDirectionDeg: 0, weatherCode: 0 },
      { hour: 10, time: "10:00", temperatureC: 22, precipitationProbability: 0, windSpeedKmh: 8, windDirectionDeg: 0, weatherCode: 0 },
      { hour: 11, time: "11:00", temperatureC: 27, precipitationProbability: 0, windSpeedKmh: 10, windDirectionDeg: 0, weatherCode: 0 },
    ];
    const res = computeSuitabilityScore(slots);
    expect(res.label).not.toBe("Chaud");
    expect(res.label).toMatch(/idéales|bonnes conditions/i);
  });

  it("notifie 'Risque d'annulation : fort' si la pluie est quasi sûre (>= 80%) ou orage", () => {
    const rainSlots: RideWeatherHour[] = [
      { hour: 9, time: "09:00", temperatureC: 12, precipitationProbability: 85, windSpeedKmh: 15, windDirectionDeg: 0, weatherCode: 63 },
      { hour: 10, time: "10:00", temperatureC: 13, precipitationProbability: 90, windSpeedKmh: 18, windDirectionDeg: 0, weatherCode: 65 },
    ];
    const res = computeSuitabilityScore(rainSlots);
    expect(res.label).toBe("Risque d'annulation : fort");
    expect(res.badgeColor).toBe("rose");
    expect(res.score).toBeLessThanOrEqual(3.5);

    const stormSlots: RideWeatherHour[] = [
      { hour: 9, time: "09:00", temperatureC: 18, precipitationProbability: 40, windSpeedKmh: 15, windDirectionDeg: 0, weatherCode: 95 },
    ];
    const stormRes = computeSuitabilityScore(stormSlots);
    expect(stormRes.label).toBe("Risque d'annulation : fort");
    expect(stormRes.badgeColor).toBe("rose");
  });

  it("notifie 'Risque d'annulation : élevé' si la pluie est probable (60-79%)", () => {
    const slots: RideWeatherHour[] = [
      { hour: 9, time: "09:00", temperatureC: 14, precipitationProbability: 65, windSpeedKmh: 15, windDirectionDeg: 0, weatherCode: 61 },
      { hour: 10, time: "10:00", temperatureC: 15, precipitationProbability: 70, windSpeedKmh: 15, windDirectionDeg: 0, weatherCode: 61 },
    ];
    const res = computeSuitabilityScore(slots);
    expect(res.label).toBe("Risque d'annulation : élevé");
    expect(res.badgeColor).toBe("orange");
    expect(res.score).toBeLessThanOrEqual(5.0);
  });

  it("notifie 'Risque d'annulation : fort' ou 'élevé' si le vent est très fort", () => {
    // Vent très très fort (tempétueux, >= 55 km/h) -> fort
    const galeSlots: RideWeatherHour[] = [
      { hour: 9, time: "09:00", temperatureC: 16, precipitationProbability: 0, windSpeedKmh: 58, windDirectionDeg: 0, weatherCode: 0 },
    ];
    const galeRes = computeSuitabilityScore(galeSlots);
    expect(galeRes.label).toBe("Risque d'annulation : fort");
    expect(galeRes.badgeColor).toBe("rose");
    expect(galeRes.score).toBeLessThanOrEqual(3.5);

    // Vent très fort (45-54 km/h) -> élevé
    const strongSlots: RideWeatherHour[] = [
      { hour: 9, time: "09:00", temperatureC: 16, precipitationProbability: 0, windSpeedKmh: 48, windDirectionDeg: 0, weatherCode: 0 },
    ];
    const strongRes = computeSuitabilityScore(strongSlots);
    expect(strongRes.label).toBe("Risque d'annulation : élevé");
    expect(strongRes.badgeColor).toBe("orange");
  });
});

describe("interpolateWeatherAtProgress", () => {
  const weather: RideWeather = {
    temperatureC: 10,
    precipitationProbability: 0,
    windSpeedKmh: 5,
    windDirectionDeg: 0,
    weatherCode: 0,
    departureTime: "09:00",
    estimatedArrivalTime: "12:00",
    durationMinutes: 180,
    hourlySlots: [
      { hour: 9, time: "09:00", temperatureC: 10, precipitationProbability: 0, windSpeedKmh: 6, windDirectionDeg: 0, weatherCode: 0 },
      { hour: 10, time: "10:00", temperatureC: 14, precipitationProbability: 10, windSpeedKmh: 10, windDirectionDeg: 90, weatherCode: 1 },
      { hour: 11, time: "11:00", temperatureC: 18, precipitationProbability: 20, windSpeedKmh: 14, windDirectionDeg: 180, weatherCode: 2 },
    ],
  };

  it("retourne les conditions de départ à progress 0", () => {
    const point = interpolateWeatherAtProgress(weather, 0);
    expect(point?.time).toBe("09:00");
    expect(point?.temperatureC).toBe(10);
    expect(point?.slotIndex).toBe(0);
  });

  it("interpole les conditions à mi-parcours", () => {
    const point = interpolateWeatherAtProgress(weather, 0.5);
    expect(point?.time).toBe("10:30");
    expect(point?.temperatureC).toBe(14);
    expect(point?.slotIndex).toBe(1);
  });

  it("retourne les conditions de fin à progress 1", () => {
    const point = interpolateWeatherAtProgress(weather, 1);
    expect(point?.time).toBe("12:00");
    expect(point?.temperatureC).toBe(18);
    expect(point?.slotIndex).toBe(2);
  });
});

describe("fmtWeatherTempRange", () => {
  it("formate une plage de température départ → arrivée", () => {
    expect(
      fmtWeatherTempRange({
        temperatureC: 8,
        tempMin: 7,
        tempMax: 17,
        precipitationProbability: 0,
        windSpeedKmh: 5,
        windDirectionDeg: 0,
        weatherCode: 0,
      })
    ).toBe("7° → 17°");
  });

  it("formate une température unique quand min et max sont identiques", () => {
    expect(
      fmtWeatherTempRange({
        temperatureC: 15,
        tempMin: 15,
        tempMax: 15,
        precipitationProbability: 0,
        windSpeedKmh: 5,
        windDirectionDeg: 0,
        weatherCode: 0,
      })
    ).toBe("15°");
  });

  it("retourne null si weather est absent", () => {
    expect(fmtWeatherTempRange(null)).toBeNull();
    expect(fmtWeatherTempRange(undefined)).toBeNull();
  });
});

describe("weatherCodeInfo and getWeatherEmoji", () => {
  it("associe chaque code WMO à son vrai émoji météo", () => {
    expect(weatherCodeInfo(0).emoji).toBe("☀️");
    expect(weatherCodeInfo(1).emoji).toBe("🌤️");
    expect(weatherCodeInfo(2).emoji).toBe("🌤️");
    expect(weatherCodeInfo(3).emoji).toBe("🌥️");
    expect(weatherCodeInfo(45).emoji).toBe("🌥️");
    expect(weatherCodeInfo(51).emoji).toBe("🌦️");
    expect(weatherCodeInfo(61).emoji).toBe("🌧️");
    expect(weatherCodeInfo(71).emoji).toBe("❄️");
    expect(weatherCodeInfo(95).emoji).toBe("⛈️");
  });

  it("getWeatherEmoji privilégie 💨 en cas de vent fort (>= 45 km/h) sans orage/pluie lourde", () => {
    // Ciel dégagé mais vent 48 km/h -> 💨
    expect(getWeatherEmoji({ weatherCode: 0, maxWindSpeedKmh: 48 })).toBe("💨");
    // Ciel couvert avec vent 25 km/h -> 🌥️
    expect(getWeatherEmoji({ weatherCode: 3, maxWindSpeedKmh: 25 })).toBe("🌥️");
  });

  it("getWeatherEmoji conserve l'orage ou la pluie même par vent fort", () => {
    // Orage avec vent violent 60 km/h -> ⛈️
    expect(getWeatherEmoji({ weatherCode: 95, maxWindSpeedKmh: 60 })).toBe("⛈️");
    // Pluie avec vent 50 km/h -> 🌧️
    expect(getWeatherEmoji({ weatherCode: 63, maxWindSpeedKmh: 50 })).toBe("🌧️");
  });
});
