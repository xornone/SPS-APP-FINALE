// Construit un chemin SVG (attribut "d") representant la forme d'un trace
// GPX, mis a l'echelle et centre dans une boite width x height. Utilise
// pour dessiner un trace stylise (sans fond de carte) sur l'image de
// partage WhatsApp — pas de tuiles a recuperer, donc simple et fiable sur
// un hebergement gratuit.
//
// Correction de la distorsion de longitude par cos(latitude moyenne), sinon
// la forme serait etiree ou ecrasee est-ouest selon la latitude du club.
export function buildRoutePath(points: [number, number][], boxW: number, boxH: number): string {
  if (!points.length) return "";

  const lats = points.map((p) => p[0]);
  const lons = points.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const midLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const lonCorrection = Math.cos(midLatRad) || 1;
  const spanX = (maxLon - minLon) * lonCorrection || 0.0001;
  const spanY = maxLat - minLat || 0.0001;
  const scale = Math.min(boxW / spanX, boxH / spanY);
  const usedW = spanX * scale;
  const usedH = spanY * scale;
  const offsetX = (boxW - usedW) / 2;
  const offsetY = (boxH - usedH) / 2;

  const coords = points.map(([lat, lon]) => {
    const x = offsetX + (lon - minLon) * lonCorrection * scale;
    const y = offsetY + (maxLat - lat) * scale; // Y ecran croit vers le bas, lat vers le haut -> on inverse
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `M ${coords.join(" L ")}`;
}
