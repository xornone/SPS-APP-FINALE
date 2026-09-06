import { fmtDateLong, fmtKm, fmtM, fmtTime } from "./format";
import { GROUP_INFO, type GroupLevel } from "./types";
import { weatherCodeInfo, windDirectionLabel, type RideWeather } from "./weather";

export interface ShareableRide {
  title: string;
  ride_date: string;
  ride_time: string;
  place: string;
  description: string;
  distance_km: number;
  elevation_gain_m: number;
  strava_url: string | null;
}

// Construit le texte pre-rempli pour le partage WhatsApp d'une sortie.
// Fonction pure (pas d'acces reseau ni au DOM) pour rester facilement
// testable : toutes les donnees (meteo, url GPX, url de la sortie) sont
// deja resolues par l'appelant.
export function buildRideShareMessage(
  ride: ShareableRide,
  groups: GroupLevel[],
  weather: RideWeather | null,
  rideUrl: string | null
): string {
  const lines: string[] = [];

  // Le lien (details, trace GPX, inscription) est le plus important : on le
  // met en tout premier pour qu'il ne soit pas noye dans le reste du
  // message et que personne n'ait a faire defiler pour le trouver.
  if (rideUrl) {
    lines.push(`👉 Détails, trace GPX et inscription : ${rideUrl}`);
    lines.push("");
  }

  lines.push(`🚴 ${ride.title}`);
  lines.push("");
  lines.push(`📅 ${fmtDateLong(ride.ride_date)} à ${fmtTime(ride.ride_time)}`);
  lines.push(`📍 ${ride.place}`);

  if (ride.description) {
    lines.push("");
    lines.push(ride.description);
  }

  lines.push("");
  lines.push(`📏 ${fmtKm(ride.distance_km)} · D+ ${fmtM(ride.elevation_gain_m)}`);

  if (groups.length) {
    lines.push("");
    lines.push("Groupes :");
    groups.forEach((g) => {
      const info = GROUP_INFO[g];
      lines.push(`${info.emoji} ${info.label} — ${info.range}`);
    });
  }

  if (weather) {
    const sky = weatherCodeInfo(weather.weatherCode);
    lines.push("");
    lines.push(
      `🌤️ Météo prévue : ${sky.label}, ${weather.temperatureC}°, ${weather.precipitationProbability}% de pluie, vent ${weather.windSpeedKmh} km/h ${windDirectionLabel(weather.windDirectionDeg)}`
    );
  }

  if (ride.strava_url) {
    lines.push("");
    lines.push(`🔗 Strava : ${ride.strava_url}`);
  }

  return lines.join("\n");
}

// Lien "click to chat" officiel WhatsApp : ouvre l'app (ou WhatsApp Web)
// avec le texte pre-rempli, l'utilisateur choisit lui-meme la conversation
// ou le groupe de destination. Aucune cle API ni compte a connecter.
export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
