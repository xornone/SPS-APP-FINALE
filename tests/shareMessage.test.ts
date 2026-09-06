import { describe, expect, it } from "vitest";
import { buildRideShareMessage, whatsAppShareUrl, type ShareableRide } from "@/lib/shareMessage";

const RIDE: ShareableRide = {
  title: "Sortie dimanche – Pic Saint-Loup",
  ride_date: "2026-09-06",
  ride_time: "08:30:00",
  place: "Parking du stade, Saint-Clément-de-Rivière",
  description: "La classique du club.",
  distance_km: 82,
  elevation_gain_m: 850,
  strava_url: "https://www.strava.com/routes/12345",
};

describe("buildRideShareMessage", () => {
  it("inclut toujours titre, date, lieu et distance", () => {
    const msg = buildRideShareMessage(RIDE, [], null, null);
    expect(msg).toContain("Sortie dimanche – Pic Saint-Loup");
    expect(msg).toContain("dimanche 6 septembre à 08:30");
    expect(msg).toContain("Parking du stade, Saint-Clément-de-Rivière");
    expect(msg).toContain("82 km");
    expect(msg).toContain("850 m");
  });

  it("liste les groupes avec leur plage de vitesse", () => {
    const msg = buildRideShareMessage(RIDE, ["vert", "rouge"], null, null);
    expect(msg).toContain("Vert — 24–26 km/h");
    expect(msg).toContain("Rouge — 26–28 km/h");
    expect(msg).not.toContain("Violet");
  });

  it("omet le bloc groupes si aucun groupe fourni", () => {
    const msg = buildRideShareMessage(RIDE, [], null, null);
    expect(msg).not.toContain("Groupes :");
  });

  it("inclut la meteo seulement si fournie", () => {
    const withoutWeather = buildRideShareMessage(RIDE, [], null, null);
    expect(withoutWeather).not.toContain("Météo prévue");

    const withWeather = buildRideShareMessage(
      RIDE,
      [],
      { temperatureC: 22, precipitationProbability: 10, windSpeedKmh: 14, windDirectionDeg: 0, weatherCode: 0 },
      null
    );
    expect(withWeather).toContain("Météo prévue");
    expect(withWeather).toContain("22°");
    expect(withWeather).toContain("10% de pluie");
    expect(withWeather).toContain("14 km/h N");
  });

  it("inclut le lien Strava et le lien court de la sortie seulement s'ils sont fournis", () => {
    const empty = buildRideShareMessage({ ...RIDE, strava_url: null }, [], null, null);
    expect(empty).not.toContain("Strava");
    expect(empty).not.toContain("Détails");

    const full = buildRideShareMessage(RIDE, [], null, "https://spsapp2.vercel.app/s/056e1998");
    expect(full).toContain("Strava : https://www.strava.com/routes/12345");
    expect(full).toContain("Détails, trace GPX et inscription : https://spsapp2.vercel.app/s/056e1998");
    expect(full).not.toContain("Trace GPX :");
  });

  it("place le lien de la sortie en tout premier, avant le reste du message", () => {
    const msg = buildRideShareMessage(RIDE, [], null, "https://spsapp2.vercel.app/s/056e1998");
    expect(msg.startsWith("👉 Détails, trace GPX et inscription : https://spsapp2.vercel.app/s/056e1998")).toBe(true);

    const withoutLink = buildRideShareMessage(RIDE, [], null, null);
    expect(withoutLink.startsWith("🚴")).toBe(true);
  });
});

describe("whatsAppShareUrl", () => {
  it("encode le texte dans un lien wa.me", () => {
    const url = whatsAppShareUrl("Salut & bienvenue ?");
    expect(url).toBe("https://wa.me/?text=Salut%20%26%20bienvenue%20%3F");
  });
});
