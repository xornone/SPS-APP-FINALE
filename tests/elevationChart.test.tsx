import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ElevationChart } from "@/components/ElevationChart";

describe("ElevationChart", () => {
  it("arrondit correctement les élévations min et max sans afficher de décimales anormales", () => {
    // Cas réel de la sortie de Noël : min = 0.30000000000000004, max = 56.550000000000004
    const elevations = [
      0.30000000000000004,
      12.4,
      56.550000000000004,
      30.123456,
      0.30000000000000004,
    ];

    render(<ElevationChart elevations={elevations} distanceKm={25} />);

    // Doit afficher des entiers arrondis propres
    expect(screen.getByText("Min 0 m · Max 57 m")).toBeDefined();
    // Ne doit pas contenir les floats non arrondis
    expect(screen.queryByText(/0\.30000/)).toBeNull();
    expect(screen.queryByText(/56\.55000/)).toBeNull();
  });

  it("affiche par défaut le mode inactif avec touch-action: pan-y pour préserver le scroll vertical mobile", () => {
    const elevations = [10, 20, 30, 40];
    render(<ElevationChart elevations={elevations} distanceKm={10} />);

    // Le bouton 'Explorer le profil' est visible
    const exploreBtn = screen.getByRole("button", { name: /explorer le profil/i });
    expect(exploreBtn).toBeDefined();

    // La zone SVG a touch-pan-y par défaut pour laisser le scroll vertical natif
    const chartArea = screen.getByTestId("elevation-chart-container");
    expect(chartArea.classList.contains("touch-pan-y")).toBe(true);
    expect(chartArea.classList.contains("touch-none")).toBe(false);
  });

  it("active le mode exploration lors du clic sur le bouton et permet de terminer", () => {
    const elevations = [10, 20, 30, 40];
    const onScrub = vi.fn();

    render(
      <ElevationChart
        elevations={elevations}
        distanceKm={10}
        onScrub={onScrub}
      />
    );

    const exploreBtn = screen.getByRole("button", { name: /explorer le profil/i });
    fireEvent.click(exploreBtn);

    // onScrub a été initialisé au départ
    expect(onScrub).toHaveBeenCalledWith(0);

    // Le bouton devient 'Terminer'
    const finishBtn = screen.getByRole("button", { name: /terminer/i });
    expect(finishBtn).toBeDefined();

    // Le conteneur passe en touch-none pour le scrub horizontal
    const chartArea = screen.getByTestId("elevation-chart-container");
    expect(chartArea.classList.contains("touch-none")).toBe(true);
    expect(chartArea.classList.contains("touch-pan-y")).toBe(false);

    // L'aide textuelle est affichée
    expect(
      screen.getByText(/glissez horizontalement pour naviguer sur le parcours/i)
    ).toBeDefined();

    // En cliquant sur Terminer, on revient au mode normal
    fireEvent.click(finishBtn);
    expect(onScrub).toHaveBeenCalledWith(null);
    expect(screen.getByRole("button", { name: /explorer le profil/i })).toBeDefined();
    expect(chartArea.classList.contains("touch-pan-y")).toBe(true);
    expect(chartArea.classList.contains("touch-none")).toBe(false);
  });
});
