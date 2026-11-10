/**
 * Module de scraping et synchronisation des statistiques Strava des membres SPS.
 * Gère le classement annuel et les classements mensuels par mois calendaire (ex: 2026-10, 2026-11).
 */
import fs from "fs";
import path from "path";

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

// 99 membres officiels SPS avec leurs correspondances Strava validées
export const SPS_MEMBER_STRAVA_MAPPINGS: Record<string, { id: string; stravaName: string }> = {
  "Thomas Trégaro": { id: "17524404", stravaName: "Thomas Trégaro" },
  "Marina Trégaro": { id: "23098319", stravaName: "Marina Tregaro" },
  "Théo Doussot": { id: "46686127", stravaName: "Théo Doussot" },
  "Ulysse Dumas": { id: "109675276", stravaName: "Ulysse Dumas" },
  "Huu Duc Nguyen": { id: "127761085", stravaName: "Duc Ngn" },
  "Raphaël Villette": { id: "3316462", stravaName: "Raphaël Villette" },
  "Andrea Arcis-Jobert": { id: "121404173", stravaName: "Andrea Arcis" },
  "Antonin Simon": { id: "26233481", stravaName: "Antonin Simon" },
  "Margaux Dirat": { id: "105260114", stravaName: "Margaux Dirat" },
  "Franck Georges": { id: "39039042", stravaName: "Franck Georges" },
  "Hugo Lembrez": { id: "98328608", stravaName: "Hugo Lembrez" },
  "Florian Sicard-Baux": { id: "131652920", stravaName: "Florian Sicard--Baux" },
  "Julien Davallon": { id: "3235687", stravaName: "Julien Davallon" },
  "Redouane Mimouni": { id: "4661600", stravaName: "Redouane Mimouni" },
  "Frederic Tardivot (Fred)": { id: "36804008", stravaName: "Fréd TT" },
  "Tanguy Delacôte": { id: "34003207", stravaName: "Tanguy Delacôte" },
  "Nicolas Lermission": { id: "143429323", stravaName: "Nicolas Lermission" },
  "Hugo Dautruche": { id: "42037996", stravaName: "Hugo Dautruche" },
  "Nathan Andrieu": { id: "40578641", stravaName: "Nathan Andrieu" },
  "Theo Dupuy": { id: "109033327", stravaName: "Theo Dupuy" },
  "Pierrick Michel": { id: "137504714", stravaName: "Pierrick MICHEL" },
  "Diego Frappas": { id: "104860086", stravaName: "Diego Frappas" },
  "Michel Heitzmann": { id: "46890374", stravaName: "Michel Heitzmann" },
  "Theo Payet": { id: "41999903", stravaName: "Theo Payet" },
  "Matthieu Tranier": { id: "140685609", stravaName: "Matthieu Tranier" },
  "Eloi Roussel": { id: "139158307", stravaName: "Eloi Roussel" },
  "Aymeric Closier": { id: "3717532", stravaName: "Aymeric Closier" },
  "Nathan Gavalda": { id: "140687799", stravaName: "Nathan Gavalda" },
  "Vincent Carli": { id: "6809800", stravaName: "Vincent Carli" },
  "Alexis Tesseyre": { id: "41460517", stravaName: "Alexis Tesseyre" },
  "Elie Willems": { id: "43793012", stravaName: "Elie Willems" },
  "Christopher Walton": { id: "19030055", stravaName: "Chris Walton" },
  "Remy Triboult": { id: "44498305", stravaName: "Remy TRIBOULT" },
  "Kevin Costil": { id: "7320475", stravaName: "kevin costil" },
  "Ben Horny": { id: "120320770", stravaName: "Ben Horny" },
  "Xavier Tabel": { id: "13426749", stravaName: "Xavier Tabel" },
  "Loïc Pérez": { id: "6516629", stravaName: "Loïc Perez" },
  "Florian Lamarre": { id: "39474706", stravaName: "Florian Lamarre" },
  "Brandon Guillerminet": { id: "140819777", stravaName: "Brandon Guillerminet" },
  "Elias Khaldi": { id: "148601632", stravaName: "Elias going crzy" },
  "Louis Regnier": { id: "114654439", stravaName: "Louis Regnier" },
  "Mohcine Matine": { id: "117229319", stravaName: "Mohcine MATINE" },
  "Léonard Zocchetto": { id: "121404172", stravaName: "Léonard Zocchetto" },
  "Florian Maillou": { id: "121180934", stravaName: "Florian Maillou" },
  "Pierre-Louis Mejean": { id: "6805650", stravaName: "Pierre-Louis Mejean" },
  "Vincent Jacquot": { id: "105753051", stravaName: "Vincent Jacquot" },
  "François Xavier Rives": { id: "105051996", stravaName: "François-xavier Rives" },
  "Richard King": { id: "2048333447", stravaName: "Richard King" },
  "Louise Girot Person": { id: "40657656", stravaName: "Louise Girot" },
  "Nicholas Sydenham": { id: "11069796", stravaName: "Nicholas Sydenham" },
  "Valentin Ensuque": { id: "98329688", stravaName: "Valentin Ensuque" },
  "Gaspard Cayrat": { id: "138379685", stravaName: "Gaspard Cayrat" },
  "Moaad Fattali": { id: "121175659", stravaName: "Moaad Fattali" },
  "Thomas Lecoq": { id: "28723223", stravaName: "Thomas lecoq" },
  "Cédric Hamonier": { id: "7105237", stravaName: "Cédric Hamonier" },
  "Jean-Baptiste Lafon": { id: "105333127", stravaName: "Jb Lafon" },
  "Giulia Atcher": { id: "118744047", stravaName: "Giulia Atcher" },
  "Marion Buchou": { id: "47225244", stravaName: "Marion Buchou" },
  "François Granier": { id: "116499839", stravaName: "Francois Granier" },
  "Alexandre Bouyssoux": { id: "88079010", stravaName: "Alexandre Bouyssoux" },
  "Julien Boisson": { id: "116498877", stravaName: "Julien Boisson" },
  "Didier Varon": { id: "14005190", stravaName: "Didier Varon" },
  "Damien Kurtzemann": { id: "4278363", stravaName: "Damien Kurtzemann" },
  "Simon Boddaert": { id: "116499951", stravaName: "Simon Boddaert" },
  "Justine Durand": { id: "116500115", stravaName: "Justine Durand" },
  "Louis Prome": { id: "91897362", stravaName: "Louis Promé" },
  "Kieran Sweetman": { id: "105260113", stravaName: "Kieran Sweetman" },
  "Valentin Escoffier": { id: "105260115", stravaName: "Valentin Escoffier" },
  "Lucille Roux": { id: "195125562", stravaName: "Lu Lu" },
  "André Boeufgras": { id: "105260117", stravaName: "André Boeufgras" },
  "Patrick Boeufgras": { id: "48353332", stravaName: "Patrick Boeufgras" },
  "Benjamin Embry": { id: "34754434", stravaName: "Benjamin E." },
  "Clément Dubreucq": { id: "89085493", stravaName: "Clément Dubreucq" },
  "René Espinosa Rojas": { id: "185529050", stravaName: "René  E" },
  "Hendricks Delcambre": { id: "144531882", stravaName: "Hendricks Delcambre" },
  "Raquel Cardó Fernández": { id: "165159968", stravaName: "Raquel CF" },
  "Fandy Sabarila": { id: "23711779", stravaName: "Fandi Sabarila" },
  "Dorian Raymond": { id: "116499874", stravaName: "Dorian Raymond" },
  "Pierrick Pinault": { id: "58548359", stravaName: "Papo Kano" },
  "Hester van Wachem": { id: "140819779", stravaName: "Hester van Wachem" },
  "Audrey Mignon": { id: "116500109", stravaName: "Audrey Mignon" },
  "Maurizio Agnino": { id: "88079015", stravaName: "Maurizio  Agnino" },
  "Richard Planchon": { id: "16841100", stravaName: "Planchon  Richard" },
  "Lucas Nesta": { id: "140685600", stravaName: "Lucas Nesta" },
  "Anthony Capelotar": { id: "140819782", stravaName: "Anthony Capelotar" },
  "Tom Garrandaux": { id: "140819784", stravaName: "Tom Garrandaux" },
  "Mathis Roblot": { id: "38174865", stravaName: "Mathis Rblt" },
  "Charly Jegat": { id: "123685345", stravaName: "Charly  🇫🇷" },
  "Boris Cormary": { id: "105260119", stravaName: "Boris Cormary" },
  "Léo Kiner": { id: "105260121", stravaName: "Léo Kiner" },
  "Cédric Baudinet": { id: "23843091", stravaName: "Cédric Baudinet" },
  "Zoé Paquet": { id: "105273120", stravaName: "Zoe Pqt" },
  "Pauline Moalic": { id: "140819788", stravaName: "Pauline Moalic" },
  "Jonas Graffe": { id: "105260123", stravaName: "Jonas Graffe" },
  "Pierre Fabbri": { id: "105260125", stravaName: "Pierre Fabbri" },
  "Anaïs Gevaudan": { id: "105260127", stravaName: "Anaïs Gevaudan" },
  "Maxime Colin": { id: "105260129", stravaName: "Maxime Colin" },
  "Camille Frairrot": { id: "64813353", stravaName: "Cam 🌷 LaMenace" },
  "Lou Serrig": { id: "167885991", stravaName: "Lou Serrig" },
};

export function getSessionCookie(): string {
  return process.env.STRAVA_SESSION || "fnndo9dsdc8cgsfo9ncj70b13kkip0cn";
}

function getDataFilePath(): string {
  const localData = path.join(process.cwd(), "data/strava_sps_stats.json");
  return localData;
}

/**
 * Récupère les données Strava en cache (depuis /tmp si Vercel, sinon data/strava_sps_stats.json)
 */
export function getCachedStravaData(): StravaDataStore | null {
  try {
    const tmpPath = "/tmp/strava_sps_stats.json";
    if (fs.existsSync(tmpPath)) {
      return JSON.parse(fs.readFileSync(tmpPath, "utf8"));
    }
    const localPath = getDataFilePath();
    if (fs.existsSync(localPath)) {
      return JSON.parse(fs.readFileSync(localPath, "utf8"));
    }
  } catch (err) {
    console.error("[getCachedStravaData] Erreur lecture cache :", err);
  }
  return null;
}

/**
 * Sauvegarde les données Strava dans les fichiers de cache disponibles.
 */
export function saveStravaData(data: StravaDataStore): void {
  const jsonStr = JSON.stringify(data, null, 2);

  // 1. Sauvegarde dans /tmp (toujours inscriptible y compris sur Vercel serverless)
  try {
    fs.writeFileSync("/tmp/strava_sps_stats.json", jsonStr, "utf8");
  } catch (err) {
    console.warn("[saveStravaData] Impossible d'écrire dans /tmp :", err);
  }

  // 2. Sauvegarde dans data/strava_sps_stats.json (si inscriptible)
  try {
    const localPath = getDataFilePath();
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, jsonStr, "utf8");
  } catch (err) {
    // Sur Vercel en production le filesystem local est en lecture seule, ce qui est normal
  }
}

/**
 * Récupère les stats d'un athlète pour un mois calendaire spécifique (ex: "2026-10" -> "202610")
 */
export async function fetchAthleteCalendarMonth(
  athleteId: string,
  monthKey: string // "YYYY-MM", ex: "2026-10"
): Promise<StravaMonthStats> {
  const ym = monthKey.replace("-", ""); // "202610"
  const cookie = getSessionCookie();

  try {
    const res = await fetch(
      `https://www.strava.com/athletes/${athleteId}/interval?interval=${ym}&interval_type=month&chart_type=miles&year_offset=0`,
      {
        headers: {
          Cookie: `_strava4_session=${cookie}`,
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

    // Distance en kilomètres
    const distMatch = rawHtml.match(/([0-9,.]+)\s*<abbr[^>]*title=['"]kilometer/i);
    const distanceKm = distMatch ? parseFloat(distMatch[1].replace(/,/g, "")) || 0 : 0;

    // Dénivelé en mètres
    const elevMatch = rawHtml.match(/([0-9,.]+)\s*<abbr[^>]*title=['"]meter/i);
    const elevGainM = elevMatch ? parseInt(elevMatch[1].replace(/,/g, ""), 10) || 0 : 0;

    // Temps en selle (heures et minutes)
    const hoursMatch = rawHtml.match(/(\d+)\s*<abbr[^>]*title=['"]hour['"][^>]*>h/i);
    const minsMatch = rawHtml.match(/(\d+)\s*<abbr[^>]*title=['"]minute['"][^>]*>m/i);
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const mins = minsMatch ? parseInt(minsMatch[1], 10) : 0;
    const timeStr = `${hours}h ${mins}m`;
    const totalHours = hours + mins / 60;
    const avgSpeed = totalHours > 0 ? Math.round((distanceKm / totalHours) * 10) / 10 : 0;

    // Nombre d'activités trouvées dans le flux du mois
    const matches = text.match(/Activity-\d+/g);
    const activities = matches ? new Set(matches).size : 0;

    return {
      activities,
      distance_km: distanceKm,
      elev_gain_m: elevGainM,
      time: timeStr,
      avg_speed_kmh: avgSpeed,
    };
  } catch (err) {
    console.error(`[fetchAthleteCalendarMonth] Erreur athlete ${athleteId} ${monthKey}:`, err);
    return { activities: 0, distance_km: 0, elev_gain_m: 0, time: "0h 0m", avg_speed_kmh: 0 };
  }
}

/**
 * Récupère les stats annuelles YTD globales
 */
export async function fetchAthleteAnnualStats(athleteId: string): Promise<StravaMonthStats> {
  const cookie = getSessionCookie();
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

/**
 * Synchronise les données Strava pour une liste de mois calendaires donnés (ex: ["2026-10", "2026-11"])
 */
export async function syncAllMembersStravaStats(
  targetMonths: string[] = ["2026-10", "2026-11"],
  onProgress?: (current: number, total: number) => void
): Promise<StravaDataStore> {
  const membersList = Object.entries(SPS_MEMBER_STRAVA_MAPPINGS).map(([officialName, info]) => ({
    officialName,
    athleteId: info.id,
    stravaName: info.stravaName,
  }));

  const existingStore = getCachedStravaData();
  const membersResults: StravaMemberSummary[] = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < membersList.length; i += BATCH_SIZE) {
    const batch = membersList.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (m) => {
        const annual = await fetchAthleteAnnualStats(m.athleteId);
        const prevMonths = existingStore?.members?.find((em) => em.athleteId === m.athleteId)?.months || {};
        const monthsData: Record<string, StravaMonthStats> = { ...prevMonths };

        for (const ym of targetMonths) {
          monthsData[ym] = await fetchAthleteCalendarMonth(m.athleteId, ym);
        }

        membersResults.push({
          ...m,
          annual,
          months: monthsData,
        });
      })
    );

    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, membersList.length), membersList.length);
    }
    // Petit délai de courtoisie pour éviter le rate-limiting
    await new Promise((r) => setTimeout(r, 100));
  }

  // Calcul des classements mensuels (fusionné avec les mois existants)
  const monthlyLeaders: StravaDataStore["monthlyLeaders"] = existingStore?.monthlyLeaders
    ? { ...existingStore.monthlyLeaders }
    : {};

  for (const ym of targetMonths) {
    let totalKm = 0;
    let totalElevation = 0;
    let totalActivities = 0;

    const listWithStats = membersResults.map((m) => {
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

  // Récupération automatique du segment du mois SPS
  const segment = await fetchSegmentLeaderboard("42510565");

  const store: StravaDataStore = {
    extractedAt: new Date().toISOString(),
    totalOfficialMembers: membersList.length,
    totalMatched: membersResults.length,
    members: membersResults,
    monthlyLeaders,
    segmentOfMonth: segment || existingStore?.segmentOfMonth,
  };

  saveStravaData(store);
  return store;
}

/**
 * Récupère le classement d'un segment Strava spécifique (ex: segment du mois SPS)
 */
export async function fetchSegmentLeaderboard(
  segmentId: string = "42510565"
): Promise<StravaSegmentOfMonth | null> {
  const cookie = getSessionCookie();
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
