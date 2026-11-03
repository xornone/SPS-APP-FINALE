import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { RideWeatherBadge } from "@/components/RideWeatherBadge";
import type { RideWeather } from "@/lib/weather";

const mockWeather: RideWeather = {
  temperatureC: 12,
  precipitationProbability: 15,
  windSpeedKmh: 14,
  windDirectionDeg: 320,
  weatherCode: 2, // Éclaircies

  departureTime: "09:00",
  estimatedArrivalTime: "11:45",
  durationMinutes: 165,
  durationFormatted: "2h45",

  tempMin: 12,
  tempMax: 17,
  avgTemp: 14.5,
  maxPrecipitationProbability: 20,
  maxWindSpeedKmh: 18,
  suitabilityScore: 8.5,
  suitabilityLabel: "Très bonnes conditions",
  suitabilitySummary: "Fraîcheur au départ (12°), douceur (17°) · Faible risque pluie (20%) · Vent modéré",
  suitabilityBadgeColor: "green",

  hourlySlots: [
    {
      time: "09:00",
      hour: 9,
      temperatureC: 12,
      precipitationProbability: 5,
      windSpeedKmh: 10,
      windDirectionDeg: 320,
      weatherCode: 1, // Plutôt dégagé
    },
    {
      time: "10:00",
      hour: 10,
      temperatureC: 14,
      precipitationProbability: 10,
      windSpeedKmh: 12,
      windDirectionDeg: 320,
      weatherCode: 2, // Éclaircies
    },
    {
      time: "11:00",
      hour: 11,
      temperatureC: 16,
      precipitationProbability: 20,
      windSpeedKmh: 15,
      windDirectionDeg: 320,
      weatherCode: 3, // Couvert
    },
    {
      time: "12:00",
      hour: 12,
      temperatureC: 17,
      precipitationProbability: 15,
      windSpeedKmh: 18,
      windDirectionDeg: 320,
      weatherCode: 2, // Éclaircies
    },
  ],
};

describe("RideWeatherBadge", () => {
  it("affiche le badge compact fermé par défaut", () => {
    render(<RideWeatherBadge weather={mockWeather} />);
    expect(screen.getByText("Très bonnes conditions")).toBeDefined();
    expect(screen.getByText("12° → 17°")).toBeDefined();
    expect(screen.getByText("8.5")).toBeDefined();
    const trigger = screen.getByRole("button", { name: /très bonnes conditions/i });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    // Le panneau heure par heure ne doit pas être visible
    expect(screen.queryByText("Météo sur le parcours")).toBeNull();
  });

  it("déploie les prévisions heure par heure lors d'un clic", () => {
    render(<RideWeatherBadge weather={mockWeather} />);
    const trigger = screen.getByRole("button", { name: /très bonnes conditions/i });

    // Clic pour ouvrir
    fireEvent.click(trigger);

    // Panneau visible
    expect(screen.getByText("Météo sur le parcours")).toBeDefined();
    expect(screen.getByText(/09:00 → 11:45/)).toBeDefined();
    expect(screen.getByText("~2h45")).toBeDefined();

    // Vérifie les créneaux horaires
    expect(screen.getByText("09h00")).toBeDefined();
    expect(screen.getByText("10h00")).toBeDefined();
    expect(screen.getByText("11h00")).toBeDefined();
    expect(screen.getByText("12h00")).toBeDefined();

    // Vérifie les tags Départ et Arrivée
    expect(screen.getByText("Départ")).toBeDefined();
    expect(screen.getByText("Arrivée")).toBeDefined();

    // Vérifie le risque de pluie en %
    expect(screen.getByText("5%")).toBeDefined();
    expect(screen.getByText("10%")).toBeDefined();
    expect(screen.getByText("20%")).toBeDefined();

    // Vérifie les températures
    expect(screen.getByText("12°")).toBeDefined();
    expect(screen.getByText("14°")).toBeDefined();
    expect(screen.getByText("16°")).toBeDefined();
    expect(screen.getByText("17°")).toBeDefined();

    // Vérifie le résumé de conseil
    expect(screen.getByText(mockWeather.suitabilitySummary!)).toBeDefined();
  });

  it("se referme lors d'un second clic ou sur le bouton fermer", () => {
    render(<RideWeatherBadge weather={mockWeather} />);
    const trigger = screen.getByRole("button", { name: /très bonnes conditions/i });

    // Ouvre
    fireEvent.click(trigger);
    expect(screen.getByText("Météo sur le parcours")).toBeDefined();

    // Ferme via le bouton X
    const closeBtn = screen.getByTitle("Fermer le détail heure par heure");
    fireEvent.click(closeBtn);
    expect(screen.queryByText("Météo sur le parcours")).toBeNull();

    // Ouvre à nouveau
    fireEvent.click(trigger);
    expect(screen.getByText("Météo sur le parcours")).toBeDefined();

    // Ferme via un second clic sur le trigger
    fireEvent.click(trigger);
    expect(screen.queryByText("Météo sur le parcours")).toBeNull();
  });
});
