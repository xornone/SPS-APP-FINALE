import { createAdminClient } from "./supabase/admin";

// Fonctions serveur uniquement (OAuth Strava + appels API Strava) pour
// l'import automatique du trace GPX d'une sortie depuis un lien Strava,
// sans repasser par un export/import manuel de fichier .gpx. Jamais
// importe depuis un composant client.
//
// La connexion Strava est personnelle a l'admin connecte : elle est
// enregistree sous son admin_user_id (l'id de sa propre session Supabase),
// jamais sous un identifiant partage — voir admin_strava_connections
// (migration 0008). Chaque admin ne voit et n'utilise donc que son propre
// compte Strava, jamais celui d'un autre admin.

const TOKEN_URL = "https://www.strava.com/oauth/token";
const AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://spsapp2.vercel.app";
}

export function stravaAuthorizeUrl(): string {
  const clientId = process.env.STRAVA_CLIENT_ID;
  if (!clientId) throw new Error("STRAVA_CLIENT_ID manquante — voir configuration Vercel.");
  const redirectUri = `${siteUrl()}/api/admin/strava/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    // activity:read_all : necessaire pour lire le trace GPS (streams) des
    // activites de l'athlete, y compris celles non publiques.
    // read_all : necessaire pour l'export GPX des routes (parcours
    // planifies) et pour lister ses propres routes — endpoints distincts
    // des activites, avec leur propre scope.
    scope: "activity:read_all,read_all",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

interface StravaAthlete {
  id: number;
  firstname?: string;
  lastname?: string;
}

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number; // secondes unix
  athlete?: StravaAthlete;
}

function requireStravaCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Identifiants Strava manquants (STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET).");
  }
  return { clientId, clientSecret };
}

export async function exchangeStravaCode(code: string): Promise<StravaTokenResponse> {
  const { clientId, clientSecret } = requireStravaCredentials();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, grant_type: "authorization_code" }),
  });
  if (!res.ok) {
    // Le corps de reponse de Strava (JSON avec message/errors) est bien
    // plus utile pour diagnostiquer que le seul code HTTP — client_id ou
    // client_secret invalide, code deja utilise, etc.
    const detail = await res.text().catch(() => "");
    throw new Error(`Échange du code Strava échoué (${res.status})${detail ? ` — ${detail.slice(0, 300)}` : ""}.`);
  }
  return res.json();
}

async function refreshStravaToken(refreshToken: string): Promise<StravaTokenResponse> {
  const { clientId, clientSecret } = requireStravaCredentials();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Rafraîchissement du jeton Strava échoué (${res.status})${detail ? ` — ${detail.slice(0, 300)}` : ""}.`);
  }
  return res.json();
}

function athleteName(athlete?: StravaAthlete): string {
  const name = [athlete?.firstname, athlete?.lastname].filter(Boolean).join(" ").trim();
  return name || `Athlète Strava ${athlete?.id ?? ""}`.trim();
}

/** Enregistre (ou remplace) la connexion Strava de CET admin — jamais celle
 * d'un autre, puisqu'elle est indexee par son propre admin_user_id. */
export async function saveStravaConnection(adminUserId: string, token: StravaTokenResponse): Promise<string> {
  if (!token.athlete?.id) throw new Error("Réponse Strava inattendue (athlète manquant).");
  const name = athleteName(token.athlete);
  const supabase = createAdminClient();
  const { error } = await supabase.from("admin_strava_connections").upsert(
    {
      admin_user_id: adminUserId,
      strava_athlete_id: token.athlete.id,
      athlete_name: name,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_at,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "admin_user_id" }
  );
  if (error) throw new Error(error.message);
  return name;
}

export interface StravaConnection {
  athleteId: number;
  athleteName: string;
}

/** La connexion Strava de CET admin uniquement (jamais celle des autres). */
export async function getMyStravaConnection(adminUserId: string): Promise<StravaConnection | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_strava_connections")
    .select("strava_athlete_id, athlete_name")
    .eq("admin_user_id", adminUserId)
    .maybeSingle();
  if (error || !data) return null;
  return { athleteId: data.strava_athlete_id, athleteName: data.athlete_name };
}

export async function disconnectStrava(adminUserId: string) {
  const supabase = createAdminClient();
  await supabase.from("admin_strava_connections").delete().eq("admin_user_id", adminUserId);
}

/** Recupere un access token Strava valide pour CET admin, en le
 * rafraichissant au besoin. */
export async function getValidAccessToken(adminUserId: string): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_strava_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("admin_user_id", adminUserId)
    .maybeSingle();
  if (error || !data) throw new Error("Tu n'as pas encore connecté ton compte Strava.");

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (data.expires_at > nowSeconds + 60) {
    return data.access_token;
  }

  // Jeton expire (ou presque) : on le rafraichit et on enregistre le
  // nouveau couple access/refresh token — Strava fait tourner le refresh
  // token a chaque rafraichissement, l'ancien devient invalide.
  const refreshed = await refreshStravaToken(data.refresh_token);
  await supabase
    .from("admin_strava_connections")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: refreshed.expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq("admin_user_id", adminUserId);
  return refreshed.access_token;
}

export interface StravaResource {
  type: "activity" | "route";
  id: string;
}

/** Extrait le type (activite enregistree, ou route/parcours planifie) et
 * l'identifiant numerique depuis une URL Strava — les sorties du club sont
 * le plus souvent partagees comme une "route" (parcours planifie), pas
 * comme une "activity" (sortie deja effectuee), d'ou la prise en charge
 * des deux formats :
 * - https://www.strava.com/activities/1234567890
 * - https://www.strava.com/routes/1234567890 */
export function extractStravaResource(url: string): StravaResource | null {
  const activityMatch = url.match(/strava\.com\/activities\/(\d+)/);
  if (activityMatch) return { type: "activity", id: activityMatch[1] };
  const routeMatch = url.match(/strava\.com\/routes\/(\d+)/);
  if (routeMatch) return { type: "route", id: routeMatch[1] };
  return null;
}

interface StravaStreams {
  latlng?: { data: [number, number][] };
  altitude?: { data: number[] };
}

export async function fetchStravaActivityStreams(accessToken: string, activityId: string): Promise<StravaStreams> {
  const res = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=latlng,altitude&key_by_type=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    throw new Error(
      res.status === 404 || res.status === 403
        ? "Activité introuvable ou non accessible avec ce compte Strava (doit appartenir à l'admin connecté)."
        : `Erreur Strava (${res.status}).`
    );
  }
  return res.json();
}

/** Les routes (parcours planifies, pas encore effectues) ont leur propre
 * endpoint d'export GPX cote Strava, qui renvoie directement le fichier GPX
 * complet — pas besoin de le reconstruire nous-memes a partir de streams
 * comme pour une activite. */
export async function fetchStravaRouteGpx(accessToken: string, routeId: string): Promise<string> {
  const res = await fetch(`https://www.strava.com/api/v3/routes/${routeId}/export_gpx`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(
      res.status === 404 || res.status === 403
        ? "Route introuvable ou non accessible avec ce compte Strava (doit appartenir à l'admin connecté)."
        : `Erreur Strava (${res.status}).`
    );
  }
  return res.text();
}

export interface StravaRouteSummary {
  id: string;
  name: string;
  distanceKm: number;
  elevationGainM: number;
}

/** Liste les routes (parcours planifies) enregistrees sur le compte Strava
 * connecte, pour proposer un choix rapide dans le formulaire de sortie
 * plutot que de devoir aller copier/coller le lien depuis Strava. */
export async function fetchAthleteRoutes(accessToken: string): Promise<StravaRouteSummary[]> {
  const res = await fetch(`https://www.strava.com/api/v3/athlete/routes?per_page=50`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Impossible de récupérer tes traces Strava (${res.status}).`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((r: any) => ({
    id: String(r.id),
    name: r.name || `Trace ${r.id}`,
    distanceKm: Math.round((r.distance || 0) / 100) / 10,
    elevationGainM: Math.round(r.elevation_gain || 0),
  }));
}

/** Construit un fichier GPX minimal (trace + altitude) a partir des streams
 * Strava, pour reutiliser tel quel le pipeline d'import GPX existant
 * (lib/gpx.ts parseGpx, bucket de stockage "gpx") sans dupliquer sa logique. */
export function buildGpxFromStreams(streams: StravaStreams, activityName: string): string {
  const points = streams.latlng?.data || [];
  const altitudes = streams.altitude?.data || [];
  if (points.length < 2) throw new Error("Cette activité Strava ne contient pas de trace GPS exploitable.");

  const trkpts = points
    .map(([lat, lon], i) => {
      const ele = altitudes[i];
      const eleTag = typeof ele === "number" ? `<ele>${ele.toFixed(1)}</ele>` : "";
      return `<trkpt lat="${lat}" lon="${lon}">${eleTag}</trkpt>`;
    })
    .join("");

  const escapedName = activityName.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));

  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="SPS App (import Strava)" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${escapedName}</name><trkseg>${trkpts}</trkseg></trk></gpx>`;
}
