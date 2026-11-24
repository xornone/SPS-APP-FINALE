/**
 * Module de scraping et synchronisation des statistiques Strava des membres SPS.
 * Gère le classement annuel et les classements mensuels par mois calendaire (ex: 2026-10, 2026-11).
 */
import fs from "fs";
import path from "path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createPublicClient } from "@/lib/supabase/publicClient";

export interface StravaMonthStats {
  activities: number;
  distance_km: number;
  elev_gain_m: number;
  time: string;
  avg_speed_kmh?: number;
}

export interface StravaMemberSummary {
  officialName: string;
  stravaName: string;
  athleteId: string;
  annual: StravaMonthStats;
  months: Record<string, StravaMonthStats>; // Clé "YYYY-MM" (ex: "2026-10")
}

export interface StravaLeaderboardEntry {
  rank: number;
  officialName: string;
  stravaName: string;
  athleteId: string;
  activities: number;
  distance_km: number;
  elev_gain_m: number;
  time: string;
  avg_speed_kmh?: number;
}

export interface StravaSegmentLeaderboardEntry {
  rank: number;
  officialName: string;
  stravaName: string;
  athleteId: string;
  avatar: string | null;
  timeSeconds: number;
  timeFormatted: string;
  speedKmh: number;
  date: string;
}

export interface StravaSegmentOfMonth {
  segmentId: string;
  name: string;
  distance_km: number;
  elev_gain_m: number;
  avg_grade: number;
  stravaUrl: string;
  appUrl: string;
  leaderboard: StravaSegmentLeaderboardEntry[];
}

export interface StravaDataStore {
  extractedAt: string;
  totalOfficialMembers: number;
  totalMatched: number;
  members: StravaMemberSummary[];
  monthlyLeaders: Record<
    string,
    {
      topDistance: StravaLeaderboardEntry[];
      topElevation: StravaLeaderboardEntry[];
      topSpeed?: StravaLeaderboardEntry[];
      totalKm: number;
      totalElevation: number;
      totalActivities: number;
    }
  >;
  segmentOfMonth?: StravaSegmentOfMonth;
}

// 99 membres officiels SPS et tokens de session Strava
export { SPS_MEMBER_STRAVA_MAPPINGS, STRAVA_SESSION_CANDIDATES } from "./stravaMappings";
import { SPS_MEMBER_STRAVA_MAPPINGS, STRAVA_SESSION_CANDIDATES } from "./stravaMappings";

let cachedWorkingCookie: string | null = null;

export function getSessionCookie(): string {
  return cachedWorkingCookie || STRAVA_SESSION_CANDIDATES[0].token;
}

/**
 * Vérifie l'état de connexion de la session Strava auprès des serveurs Strava.
 */
export async function checkStravaSessionStatus(customCookie?: string): Promise<{
  ok: boolean;
  connected: boolean;
  status: number;
  redirect: string | null;
}> {
  const cookie = customCookie || getSessionCookie();
  try {
    const res = await fetch("https://www.strava.com/settings/profile", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Cookie: `_strava4_session=${cookie}`,
      },
      redirect: "manual",
      cache: "no-store",
    });

    return {
      ok: true,
      connected: res.status === 200,
      status: res.status,
      redirect: res.headers.get("location"),
    };
  } catch (err) {
    return {
      ok: false,
      connected: false,
      status: 500,
      redirect: null,
    };
  }
}

/**
 * Vérifie l'ensemble des sessions (Principal + Backups) et sélectionne la première active.
 */
export async function checkAllStravaSessions(): Promise<{
  connected: boolean;
  activeLabel: string | null;
  activeToken: string | null;
  details: { label: string; connected: boolean; status: number }[];
}> {
  const details: { label: string; connected: boolean; status: number }[] = [];
  let firstConnectedLabel: string | null = null;
  let firstConnectedToken: string | null = null;

  for (const candidate of STRAVA_SESSION_CANDIDATES) {
    const status = await checkStravaSessionStatus(candidate.token);
    details.push({
      label: candidate.label,
      connected: status.connected,
      status: status.status,
    });
    if (status.connected && !firstConnectedToken) {
      firstConnectedToken = candidate.token;
      firstConnectedLabel = candidate.label;
      cachedWorkingCookie = candidate.token;
    }
  }

  return {
    connected: !!firstConnectedToken,
    activeLabel: firstConnectedLabel,
    activeToken: firstConnectedToken,
    details,
  };
}

function getDataFilePath(): string {
  const localData = path.join(process.cwd(), "data/strava_sps_stats.json");
  return localData;
}

/**
 * Retourne le client Supabase le plus approprié pour le cache Strava :
 * Service Role (prioritaire côté serveur pour bypasser RLS) ou client public anon.
 */
function getSupabaseClientForCache() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey && serviceKey.length > 20 && serviceKey !== "eyJ...") {
    try {
      return createSupabaseClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    } catch {}
  }
  return createPublicClient();
}

/**
 * Récupère les données Strava en cache.
 * Priorité 1 : Table Supabase `strava_cache` (partagée entre toutes les instances Vercel).
 * Priorité 2 : Cache /tmp (si même instance).
 * Priorité 3 : data/strava_sps_stats.json (fallback statique git).
 */
export async function getCachedStravaData(): Promise<StravaDataStore | null> {
  // 1. Supabase strava_cache (persistant entre toutes les instances Vercel)
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = getSupabaseClientForCache();
      const { data, error } = await supabase
        .from("strava_cache")
        .select("data")
        .eq("key", "latest")
        .maybeSingle();

      if (!error && data?.data) {
        return data.data as StravaDataStore;
      }
    }
  } catch {
    // Fallback silencieux vers les fichiers
  }

  // 2. Fichier /tmp
  try {
    const tmpPath = "/tmp/strava_sps_stats.json";
    if (fs.existsSync(tmpPath)) {
      return JSON.parse(fs.readFileSync(tmpPath, "utf8"));
    }
  } catch {}

  // 3. Fichier data/strava_sps_stats.json
  try {
    const localPath = getDataFilePath();
    if (fs.existsSync(localPath)) {
      return JSON.parse(fs.readFileSync(localPath, "utf8"));
    }
  } catch (err) {
    console.error("[getCachedStravaData] Erreur lecture cache local :", err);
  }
  return null;
}

/**
 * Sauvegarde les données Strava :
 * 1. Dans Supabase (clé: "latest") pour persistance sur Vercel serverless.
 * 2. Dans /tmp (pour l'instance en cours).
 * 3. Dans data/strava_sps_stats.json (si filesystem inscriptible).
 */
export async function saveStravaData(data: StravaDataStore): Promise<void> {
  const jsonStr = JSON.stringify(data, null, 2);

  // 1. Sauvegarde dans Supabase
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = getSupabaseClientForCache();
      const { error } = await supabase
        .from("strava_cache")
        .upsert({ key: "latest", data, updated_at: new Date().toISOString() });
      if (error) {
        console.warn("[saveStravaData] Supabase non disponible ou table absente :", error.message);
      } else {
        console.log("[saveStravaData] Données Strava sauvegardées dans Supabase (clé: latest)");
      }
    }
  } catch (err) {
    console.warn("[saveStravaData] Erreur tentative sauvegarde Supabase :", err);
  }

  // 2. Sauvegarde dans /tmp
  try {
    fs.writeFileSync("/tmp/strava_sps_stats.json", jsonStr, "utf8");
  } catch (err) {
    console.warn("[saveStravaData] Impossible d'écrire dans /tmp :", err);
  }

  // 3. Sauvegarde dans data/strava_sps_stats.json (si inscriptible)
  try {
    const localPath = getDataFilePath();
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, jsonStr, "utf8");
  } catch {
    // Sur Vercel en production le filesystem local est en lecture seule
  }
}

/**
 * Récupère les stats d'un athlète pour un mois calendaire spécifique (ex: "2026-10" -> "202610")
 */
export async function fetchAthleteCalendarMonth(
  athleteId: string,
  monthKey: string, // "YYYY-MM", ex: "2026-10"
  customCookie?: string
): Promise<StravaMonthStats> {
  const ym = monthKey.replace("-", ""); // "202610"
  const cookie = customCookie || getSessionCookie();

  try {
    const res = await fetch(
      `https://www.strava.com/athletes/${athleteId}/interval?interval=${ym}&interval_type=month&chart_type=miles&year_offset=0`,
      {
        headers: {
          Cookie: `_strava4_session=${cookie}`,
          Accept: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01",
          "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
          "Referer": `https://www.strava.com/athletes/${athleteId}`,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      }
    );

    if (!res.ok) {
      return { activities: 0, distance_km: 0, elev_gain_m: 0, time: "0h 0m" };
    }

    const text = await res.text();
    const totalsMatch = text.match(/jQuery\("#totals"\)\.html\("([\s\S]*?)"\);/);
    if (!totalsMatch) {
      return { activities: 0, distance_km: 0, elev_gain_m: 0, time: "0h 0m" };
    }

    const rawHtml = totalsMatch[1].replace(/\\n/g, " ").replace(/\\/g, "");

    // Distance en kilomètres (supporte français 'kilomètres' ou anglais 'kilometers')
    const distMatch = rawHtml.match(
      /([0-9\s\u00a0\u202f,.]+)\s*<abbr[^>]*title=['"](?:kilometers?|kilomètres?)['"][^>]*>\s*km<\/abbr>/i
    );
    let distanceKm = 0;
    if (distMatch) {
      let cleaned = distMatch[1].replace(/[\s\u00a0\u202f]/g, "");
      if (cleaned.includes(",") && !cleaned.includes(".")) {
        cleaned = cleaned.replace(",", ".");
      } else if (cleaned.includes(",") && cleaned.includes(".")) {
        cleaned = cleaned.replace(/,/g, "");
      }
      distanceKm = parseFloat(cleaned) || 0;
    }

    // Dénivelé en mètres (supporte français 'mètres' ou anglais 'meters')
    const elevMatch = rawHtml.match(
      /([0-9\s\u00a0\u202f,.]+)\s*<abbr[^>]*title=['"](?:meters?|mètres?)['"][^>]*>\s*m<\/abbr>/i
    );
    let elevGainM = 0;
    if (elevMatch) {
      const cleaned = elevMatch[1].replace(/[\s\u00a0\u202f,.]/g, "");
      elevGainM = parseInt(cleaned, 10) || 0;
    }

    // Temps en selle (heures et minutes, français 'heure'/'min' ou anglais 'hour'/'m')
    const hoursMatch = rawHtml.match(/(\d+)\s*<abbr[^>]*title=['"](?:hour|heure)s?['"][^>]*>h<\/abbr>/i);
    const minsMatch = rawHtml.match(/(\d+)\s*<abbr[^>]*title=['"]minutes?['"][^>]*>(?:m|min)<\/abbr>/i);
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const mins = minsMatch ? parseInt(minsMatch[1], 10) : 0;
    const timeStr = `${hours}h ${mins}m`;
    const totalHours = hours + mins / 60;
    const avgSpeed = totalHours > 0 ? Math.round((distanceKm / totalHours) * 10) / 10 : 0;

    // Nombre total d'activités trouvées dans le flux du mois
    const matches = text.match(/Activity-\d+/g);
    const rawActivities = matches ? new Set(matches).size : 0;

    // Détection et soustraction des activités non-cyclistes (ex: Run, Walk, Hike, Trail).
    // Strava #totals cumule par défaut tous les sports dans le graphique d'intervalle.
    const CYCLING_TYPES = new Set(["Ride", "VirtualRide", "EBikeRide", "GravelRide", "MountainBikeRide"]);
    const chunks = text.split("&quot;entity&quot;:&quot;Activity&quot;");
    let nonCyclingKm = 0;
    let nonCyclingElevM = 0;
    let nonCyclingCount = 0;

    for (let i = 1; i < chunks.length; i++) {
      const chunk = chunks[i];
      const typeM = chunk.match(/&quot;type&quot;:&quot;([^&]+)&quot;/);
      const type = typeM ? typeM[1] : "Ride";
      if (!CYCLING_TYPES.has(type)) {
        // Distance de l'activité non-cycliste (supporte virgule et point)
        const distM = chunk.match(/&quot;key&quot;:&quot;stat_one&quot;,&quot;value&quot;:&quot;([0-9\s\u00a0\u202f,.]+)/);
        let dist = 0;
        if (distM) {
          let cleaned = distM[1].replace(/[\s\u00a0\u202f]/g, "");
          if (cleaned.includes(",") && !cleaned.includes(".")) {
            cleaned = cleaned.replace(",", ".");
          } else if (cleaned.includes(",") && cleaned.includes(".")) {
            cleaned = cleaned.replace(/,/g, "");
          }
          dist = parseFloat(cleaned) || 0;
        }
        nonCyclingKm += dist;
        nonCyclingCount++;

        // Dénivelé éventuel de l'activité non-cycliste (ex: Trail, Randonnée)
        if (chunk.includes("&quot;Dénivelé&quot;") || chunk.includes("&quot;Elevation&quot;")) {
          const elevM = chunk.match(/&quot;key&quot;:&quot;stat_two&quot;,&quot;value&quot;:&quot;([0-9\s\u00a0\u202f,.]+)/);
          if (elevM) {
            const elevClean = elevM[1].replace(/[\s\u00a0\u202f,.]/g, "");
            nonCyclingElevM += parseInt(elevClean, 10) || 0;
          }
        }
      }
    }

    const cleanDistanceKm = Math.max(0, Math.round((distanceKm - nonCyclingKm) * 10) / 10);
    const cleanElevGainM = Math.max(0, elevGainM - nonCyclingElevM);
    const cleanActivities = Math.max(0, rawActivities - nonCyclingCount);
    const cleanAvgSpeed = totalHours > 0 ? Math.round((cleanDistanceKm / totalHours) * 10) / 10 : 0;

    return {
      activities: cleanActivities,
      distance_km: cleanDistanceKm,
      elev_gain_m: cleanElevGainM,
      time: timeStr,
      avg_speed_kmh: cleanAvgSpeed,
    };
  } catch (err) {
    console.error(`[fetchAthleteCalendarMonth] Erreur athlete ${athleteId} ${monthKey}:`, err);
    return { activities: 0, distance_km: 0, elev_gain_m: 0, time: "0h 0m", avg_speed_kmh: 0 };
  }
}

/**
 * Récupère les stats annuelles YTD globales
 */
export async function fetchAthleteAnnualStats(
  athleteId: string,
  customCookie?: string
): Promise<StravaMonthStats> {
  const cookie = customCookie || getSessionCookie();
  try {
    const res = await fetch(`https://www.strava.com/athletes/${athleteId}/profile_sidebar_comparison?hl=en-US`, {
      headers: {
        Cookie: `_strava4_session=${cookie}`,
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) return { activities: 0, distance_km: 0, elev_gain_m: 0, time: "0h 0m" };
    const html = await res.text();
    const sport0Match = html.match(/<div class=['"][^"']*sport-0[\s\S]*?<\/table>/);
    if (!sport0Match) return { activities: 0, distance_km: 0, elev_gain_m: 0, time: "0h 0m" };

    const s0 = sport0Match[0];
    const ytdMatch = s0.match(/<tbody id=['"]sport-0-ytd['"]>([\s\S]*?)<\/tbody>/);
    const ytdBlock = ytdMatch ? ytdMatch[1] : "";

    function extractCell(block: string, label: string) {
      const r = new RegExp(`<td>${label}<\\/td>\\s*<td>([^<]+)<\\/td>`, "i");
      const m = block.match(r);
      return m ? m[1].trim() : null;
    }

    const activities = parseInt((extractCell(ytdBlock, "Activities") || "0").replace(/[^0-9]/g, ""), 10) || 0;
    const distanceKm =
      parseFloat((extractCell(ytdBlock, "Distance") || "0").replace(/,/g, "").replace(/[^0-9.]/g, "")) || 0;
    const elevGainM =
      parseInt((extractCell(ytdBlock, "Elev Gain") || "0").replace(/,/g, "").replace(/[^0-9]/g, ""), 10) || 0;
    const timeStr = extractCell(ytdBlock, "Time") || "0h 0m";

    return {
      activities,
      distance_km: distanceKm,
      elev_gain_m: elevGainM,
      time: timeStr,
    };
  } catch (err) {
    return { activities: 0, distance_km: 0, elev_gain_m: 0, time: "0h 0m" };
  }
}

export interface SyncStravaOptions {
  months?: string[];
  offset?: number;
  limit?: number;
}

/**
 * Synchronise les données Strava pour une liste de mois calendaires donnés (ex: ["2026-11"]).
 * Supporte le mode complet ou par morceaux (offset/limit) pour rester sous les timeouts serverless.
 */
export async function syncAllMembersStravaStats(
  targetMonthsOrOptions?: string[] | SyncStravaOptions,
  onProgress?: (current: number, total: number) => void
): Promise<StravaDataStore> {
  let targetMonths: string[] | undefined;
  let offset = 0;
  let limit: number | undefined;

  if (targetMonthsOrOptions && !Array.isArray(targetMonthsOrOptions)) {
    targetMonths = targetMonthsOrOptions.months;
    offset = targetMonthsOrOptions.offset ?? 0;
    limit = targetMonthsOrOptions.limit;
  } else if (Array.isArray(targetMonthsOrOptions)) {
    targetMonths = targetMonthsOrOptions;
  }

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const effectiveMonths = targetMonths && targetMonths.length > 0 ? targetMonths : [currentMonthKey];

  // Vérification de sécurité avec bascule automatique sur les backups
  const sessionCheck = await checkAllStravaSessions();
  if (!sessionCheck.connected || !sessionCheck.activeToken) {
    throw new Error(
      "Toutes les sessions Strava (Principal, Backup 1, Backup 2) sont déconnectées ou expirées. Veuillez renouveler le cookie _strava4_session."
    );
  }

  const cookie = sessionCheck.activeToken;

  const fullMembersList = Object.entries(SPS_MEMBER_STRAVA_MAPPINGS).map(([officialName, info]) => ({
    officialName,
    athleteId: info.id,
    stravaName: info.stravaName,
  }));

  const membersToSync = limit !== undefined
    ? fullMembersList.slice(offset, offset + limit)
    : fullMembersList;

  console.log(
    `[syncAllMembersStravaStats] Synchronisation via la session Strava : ${sessionCheck.activeLabel} (offset: ${offset}, limit: ${limit ?? fullMembersList.length}, membres traités: ${membersToSync.length}/${fullMembersList.length}) pour :`,
    effectiveMonths
  );

  const existingStore = await getCachedStravaData();
  const membersMap = new Map<string, StravaMemberSummary>();

  // Si on a un store existant, on pré-remplit les membres existants
  if (existingStore?.members) {
    for (const m of existingStore.members) {
      membersMap.set(m.athleteId, m);
    }
  }

  // BATCH_SIZE = 5 : modéré et naturel (équivalent au pool de connexions simultanées de Chrome/Safari)
  const BATCH_SIZE = 5;

  for (let i = 0; i < membersToSync.length; i += BATCH_SIZE) {
    const batch = membersToSync.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (m) => {
        const prevMember = membersMap.get(m.athleteId);
        // Conserve intégralement les mois passés précédemment collectés (ex: 2026-10)
        const prevMonths = prevMember?.months || {};
        const monthsData: Record<string, StravaMonthStats> = { ...prevMonths };

        for (const ym of effectiveMonths) {
          monthsData[ym] = await fetchAthleteCalendarMonth(m.athleteId, ym, cookie);
        }

        membersMap.set(m.athleteId, {
          ...m,
          annual: prevMember?.annual || { activities: 0, distance_km: 0, elev_gain_m: 0, time: "0h 0m" },
          months: monthsData,
        });
      })
    );

    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, membersToSync.length), membersToSync.length);
    }
    const jitterMs = 120 + Math.floor(Math.random() * 120);
    await new Promise((r) => setTimeout(r, jitterMs));
  }

  // Liste complète des 99 membres
  const allMembers = fullMembersList.map((m) => {
    return (
      membersMap.get(m.athleteId) || {
        ...m,
        annual: { activities: 0, distance_km: 0, elev_gain_m: 0, time: "0h 0m" },
        months: {},
      }
    );
  });

  // Calcul des classements mensuels (fusionné avec les mois existants)
  const monthlyLeaders: StravaDataStore["monthlyLeaders"] = existingStore?.monthlyLeaders
    ? { ...existingStore.monthlyLeaders }
    : {};

  for (const ym of effectiveMonths) {
    let totalKm = 0;
    let totalElevation = 0;
    let totalActivities = 0;

    const listWithStats = allMembers.map((m) => {
      const stats = m.months[ym] || { activities: 0, distance_km: 0, elev_gain_m: 0, time: "0h 0m" };
      totalKm += stats.distance_km;
      totalElevation += stats.elev_gain_m;
      totalActivities += stats.activities;
      return {
        ...m,
        ...stats,
      };
    });

    const topDistSorted = [...listWithStats]
      .sort((a, b) => b.distance_km - a.distance_km)
      .map((m, idx) => ({
        rank: idx + 1,
        officialName: m.officialName,
        stravaName: m.stravaName,
        athleteId: m.athleteId,
        activities: m.activities,
        distance_km: m.distance_km,
        elev_gain_m: m.elev_gain_m,
        time: m.time,
      }));

    const topElevSorted = [...listWithStats]
      .sort((a, b) => b.elev_gain_m - a.elev_gain_m)
      .map((m, idx) => ({
        rank: idx + 1,
        officialName: m.officialName,
        stravaName: m.stravaName,
        athleteId: m.athleteId,
        activities: m.activities,
        distance_km: m.distance_km,
        elev_gain_m: m.elev_gain_m,
        time: m.time,
        avg_speed_kmh: m.avg_speed_kmh,
      }));

    const topSpeedSorted = [...listWithStats]
      .filter((m) => (m.distance_km || 0) >= 30 && (m.avg_speed_kmh || 0) > 0)
      .sort((a, b) => (b.avg_speed_kmh || 0) - (a.avg_speed_kmh || 0))
      .map((m, idx) => ({
        rank: idx + 1,
        officialName: m.officialName,
        stravaName: m.stravaName,
        athleteId: m.athleteId,
        activities: m.activities,
        distance_km: m.distance_km,
        elev_gain_m: m.elev_gain_m,
        time: m.time,
        avg_speed_kmh: m.avg_speed_kmh,
      }));

    monthlyLeaders[ym] = {
      topDistance: topDistSorted,
      topElevation: topElevSorted,
      topSpeed: topSpeedSorted,
      totalKm: Math.round(totalKm),
      totalElevation,
      totalActivities,
    };
  }

  const isFinalChunk = limit === undefined || offset + limit >= fullMembersList.length;

  // Récupération automatique du segment du mois SPS
  let segment = existingStore?.segmentOfMonth;
  if (isFinalChunk) {
    try {
      const segResult = await fetchSegmentLeaderboard("42510565", cookie);
      if (segResult) segment = segResult;
    } catch {}
  }

  const store: StravaDataStore = {
    extractedAt: isFinalChunk ? new Date().toISOString() : existingStore?.extractedAt || new Date().toISOString(),
    totalOfficialMembers: fullMembersList.length,
    totalMatched: allMembers.filter((m) => m.months && Object.keys(m.months).length > 0).length,
    members: allMembers,
    monthlyLeaders,
    segmentOfMonth: segment,
  };

  await saveStravaData(store);
  return store;
}

/**
 * Récupère le classement d'un segment Strava spécifique (ex: segment du mois SPS)
 */
export async function fetchSegmentLeaderboard(
  segmentId: string = "42510565",
  customCookie?: string
): Promise<StravaSegmentOfMonth | null> {
  const cookie = customCookie || getSessionCookie();
  try {
    const res = await fetch(`https://www.strava.com/segments/${segmentId}`, {
      headers: {
        Cookie: `_strava4_session=${cookie}`,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) return null;
    const text = await res.text();
    const nextDataMatch = text.match(/<script id=\"__NEXT_DATA__\" type=\"application\/json\">([\s\S]*?)<\/script>/);
    if (!nextDataMatch) return null;
    const json = JSON.parse(nextDataMatch[1]);
    const p = json.props.pageProps;

    const lb: StravaSegmentLeaderboardEntry[] = (p.initialLeaderboard?.leaderboard || []).map((e: any, idx: number) => {
      const timeSec = e.elapsedTime || 0;
      const h = Math.floor(timeSec / 3600);
      const m = Math.floor((timeSec % 3600) / 60);
      const s = timeSec % 60;
      const sStr = s < 10 ? `0${s}` : `${s}`;
      const timeFormatted = h > 0 ? `${h}:${m < 10 ? `0${m}` : `${m}`}:${sStr}` : `${m}:${sStr}`;
      return {
        rank: e.rank || idx + 1,
        officialName: e.displayName,
        stravaName: e.displayName,
        athleteId: String(e.athleteId),
        avatar: e.avatar || null,
        timeSeconds: timeSec,
        timeFormatted,
        speedKmh: Math.round(e.avgSpeed * 3.6 * 10) / 10,
        date: e.startDateLocal ? e.startDateLocal.slice(0, 10) : "",
      };
    });

    return {
      segmentId: String(p.segmentId || segmentId),
      name: p.metadata?.name || "SPS - Corum to Combaillaux",
      distance_km: Math.round(((p.measurements?.distance || 0) / 1000) * 10) / 10,
      elev_gain_m: Math.round(p.measurements?.elevGain || 0),
      avg_grade: Math.round((p.measurements?.avgGrade || 0) * 10) / 10,
      stravaUrl: `https://www.strava.com/segments/${segmentId}`,
      appUrl: "https://strava.app.link/APRoWoo5W7b",
      leaderboard: lb,
    };
  } catch (err) {
    console.error(`[fetchSegmentLeaderboard] Erreur segment ${segmentId}:`, err);
    return null;
  }
}
