/**
 * Parsing GPX cote client ET serveur.
 *
 * DOMParser est une API navigateur : elle existe globalement cote client, et
 * en environnement de test (jsdom / Vitest). Elle N'EXISTE PAS nativement
 * dans le runtime Node.js des fonctions serverless Vercel -> sans repli, tout
 * appel serveur (route API d'upload GPX) plante avec "DOMParser is not
 * defined". On utilise donc @xmldom/xmldom comme implementation de secours
 * cote serveur, et on s'appuie uniquement sur getElementsByTagName (supporte
 * par les deux implementations) plutot que sur querySelector/querySelectorAll
 * (non fournis par xmldom).
 */
function resolveDOMParser(): typeof DOMParser {
  if (typeof DOMParser !== "undefined") return DOMParser;
  const { DOMParser: XmldomParser } = require("@xmldom/xmldom");
  return XmldomParser as unknown as typeof DOMParser;
}

export interface GpxPoint {
  lat: number;
  lon: number;
  ele: number | null;
}

export interface ParsedGpx {
  points: [number, number][]; // [lat, lon]
  elevations: number[]; // toujours renseigne (estime si absent du fichier)
  distanceKm: number;
  elevationGainM: number;
  hasRealElevation: boolean;
}

const EARTH_RADIUS_KM = 6371;

/** Distance haversine entre deux points GPS, en kilometres. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Distance totale (km) d'une trace GPS. */
export function totalDistanceKm(points: { lat: number; lon: number }[]): number {
  let dist = 0;
  for (let i = 1; i < points.length; i++) {
    dist += haversineKm(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
  }
  return dist;
}

/** Denivele positif cumule (m) a partir d'une serie d'altitudes. */
export function elevationGain(elevations: number[]): number {
  let gain = 0;
  for (let i = 1; i < elevations.length; i++) {
    const delta = elevations[i] - elevations[i - 1];
    if (delta > 0) gain += delta;
  }
  return gain;
}

/**
 * Parse un fichier GPX (contenu texte XML) et retourne trace, distance et D+.
 * Retourne null si le fichier ne contient pas de points exploitables.
 */
export function parseGpx(xmlText: string): ParsedGpx | null {
  const Parser = resolveDOMParser();
  const parser = new Parser();
  const xml = parser.parseFromString(xmlText, "application/xml");
  if (xml.getElementsByTagName("parsererror").length > 0) return null;

  let nodes = Array.from(xml.getElementsByTagName("trkpt"));
  if (!nodes.length) nodes = Array.from(xml.getElementsByTagName("rtept"));
  if (!nodes.length) return null;

  const raw: GpxPoint[] = nodes
    .map((n) => {
      const lat = parseFloat(n.getAttribute("lat") || "");
      const lon = parseFloat(n.getAttribute("lon") || "");
      const eleNode = n.getElementsByTagName("ele")[0];
      const ele = eleNode ? parseFloat(eleNode.textContent || "") : null;
      return { lat, lon, ele: Number.isFinite(ele) ? ele : null };
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));

  if (raw.length < 2) return null;

  const distanceKm = totalDistanceKm(raw);
  const hasRealElevation = raw.every((p) => p.ele !== null);

  let elevations: number[];
  if (hasRealElevation) {
    elevations = raw.map((p) => p.ele as number);
  } else {
    // Estimation neutre si le GPX ne fournit pas d'altitude (rare mais possible).
    elevations = raw.map((_, i) => 40 + Math.sin((i / raw.length) * Math.PI * 3) * 15);
  }

  return {
    points: raw.map((p) => [p.lat, p.lon] as [number, number]),
    elevations,
    distanceKm,
    elevationGainM: hasRealElevation ? elevationGain(elevations) : Math.round(distanceKm * 12),
    hasRealElevation,
  };
}
