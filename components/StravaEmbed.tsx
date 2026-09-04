/**
 * Widget Strava officiel pour une trace publique, affiche en complement de
 * la carte OpenStreetMap/Leaflet pour pouvoir comparer les deux rendus.
 *
 * Ne fonctionne de maniere fiable que pour un lien de type "route"
 * (https://www.strava.com/routes/<id>) : Strava autorise l'embed direct de
 * ce type de page via /embed, sans jeton particulier, tant que la route est
 * reglee sur "Tout le monde" (visibilite publique) cote Strava. Un lien
 * d'activite (/activities/<id>) necessite un jeton d'embed genere a la main
 * (bouton "Embed" sur la page Strava, hors de portee ici) : sans lui,
 * Strava bloque l'iframe (X-Frame-Options) plutot que d'afficher la trace,
 * donc on montre un message explicite plutot qu'un cadre vide dans ce cas.
 */
function parseStravaRouteId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.replace(/^www\./, "") !== "strava.com") return null;
    const m = u.pathname.match(/^\/routes\/(\d+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export function StravaEmbed({ stravaUrl, className = "" }: { stravaUrl: string; className?: string }) {
  const routeId = parseStravaRouteId(stravaUrl);

  if (!routeId) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1.5 bg-black/[0.03] px-4 text-center text-xs text-black/45 dark:bg-white/5 dark:text-white/45 ${className}`}
      >
        <span>Aperçu Strava indisponible pour ce lien (un lien de route Strava est attendu).</span>
        <a
          href={stravaUrl}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-sps-violet600 underline dark:text-sps-violet400"
        >
          Ouvrir sur Strava
        </a>
      </div>
    );
  }

  return (
    <iframe
      className={className}
      src={`https://www.strava.com/routes/${routeId}/embed`}
      style={{ border: 0 }}
      loading="lazy"
      title="Trace Strava"
    />
  );
}
