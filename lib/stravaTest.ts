import { createAdminClient } from "./supabase/admin";

// Fonctions serveur uniquement (OAuth Strava + appels API Strava) pour la
// page de test /admin2test — import automatique du trace GPX d'une sortie
// depuis un lien d'activite Strava, sans repasser par un export/import
// manuel de fichier .gpx. Jamais importe depuis un composant client.

const TOKEN_URL = "https://www.strava.com/oauth/token";
const AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";

// Sous-ensemble volontairement restreint de ADMIN_NAMES (lib/admins.ts) :
// seuls Duc et Aymeric testent cette fonctionnalite avant un eventuel
// deploiement a tous les admins.
export const STRAVA_TEST_ADMINS = ["Duc Nguyen", "Aymeric Closier"] as const;
export type StravaTestAdminName = (typeof STRAVA_TEST_ADMINS)[number];

export function isStravaTestAdmin(name: string): name is StravaTestAdminName {
  return (STRAVA_TEST_ADMINS as readonly string[]).includes(name);
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://spsapp2.vercel.app";
}

export function stravaAuthorizeUrl(adminName: StravaTestAdminName): string {
  const clientId = process.env.STRAVA_CLIENT_ID;
  if (!clientId) throw new Error("STRAVA_CLIENT_ID manquante — voir configuration Vercel.");
  const redirectUri = `${siteUrl()}/api/admin2test/strava/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    // activity:read_all : necessaire pour lire le trace GPS (streams) des
    // activites de l'athlete, y compris celles non publiques.
    scope: "activity:read_all",
    state: adminName,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number; // secondes unix
  athlete?: { id: number };
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
  if (!res.ok) throw new Error(`Échange du code Strava échoué (${res.status}).`);
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
  if (!res.ok) throw new Error(`Rafraîchissement du jeton Strava échoué (${res.status}).`);
  return res.json();
}

export async function saveStravaConnection(adminName: StravaTestAdminName, token: StravaTokenResponse) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("admin_strava_test_connections").upsert(
    {
      admin_name: adminName,
      strava_athlete_id: token.athlete?.id ?? null,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_at,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "admin_name" }
  );
  if (error) throw new Error(error.message);
}

export async function getStravaConnections(): Promise<Record<string, { athleteId: number | null }>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_strava_test_connections")
    .select("admin_name, strava_athlete_id");
  if (error || !data) return {};
  const map: Record<string, { athleteId: number | null }> = {};
  data.forEach((row: any) => {
    map[row.admin_name] = { athleteId: row.strava_athlete_id };
  });
  return map;
}

export async function disconnectStrava(adminName: StravaTestAdminName) {
  const supabase = createAdminClient();
  await supabase.from("admin_strava_test_connections").delete().eq("admin_name", adminName);
}

/** Recupere un access token Strava valide pour un admin, en le rafraichissant au besoin. */
export async function getValidAccessToken(adminName: StravaTestAdminName): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_strava_test_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("admin_name", adminName)
    .maybeSingle();
  if (error || !data) throw new Error(`${adminName} n'a pas encore connecté son compte Strava.`);

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (data.expires_at > nowSeconds + 60) {
    return data.access_token;
  }

  // Jeton expire (ou presque) : on le rafraichit et on enregistre le
  // nouveau couple access/refresh token — Strava fait tourner le refresh
  // token a chaque rafraichissement, l'ancien devient invalide.
  const refreshed = await refreshStravaToken(data.refresh_token);
  await supabase
    .from("admin_strava_test_connections")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: refreshed.expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq("admin_name", adminName);
  return refreshed.access_token;
}

/** Extrait l'identifiant numerique d'une activite depuis une URL Strava
 * (ex: https://www.strava.com/activities/1234567890). */
export function extractStravaActivityId(url: string): string | null {
  const match = url.match(/strava\.com\/activities\/(\d+)/);
  return match ? match[1] : null;
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
