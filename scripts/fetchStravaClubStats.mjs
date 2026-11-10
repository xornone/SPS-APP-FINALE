/**
 * Script de collecte et réconciliation des statistiques Strava des membres officiels SPS
 * Club Strava: SPS (ID: 1622153)
 * Gère le classement Annuel (YTD) et les classements mensuels par mois calendaire (ex: 2026-10, 2026-11).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

const STRAVA_SESSION_COOKIE = process.env.STRAVA_SESSION || "s2cpdjqaerpj4o880jq7697femp65p0u";

// 99 membres officiels SPS avec leurs correspondances Strava validées
import { SPS_MEMBER_STRAVA_MAPPINGS } from "../lib/stravaScraper.ts";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchStrava(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      Cookie: `_strava4_session=${STRAVA_SESSION_COOKIE}`,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ...options.headers,
    },
  });
  return res;
}

// Récupérer les stats d'un athlète pour un mois calendaire spécifique (ex: "2026-10" -> "202610")
async function fetchAthleteCalendarMonth(athleteId, monthKey) {
  const ym = monthKey.replace("-", "");
  try {
    const res = await fetchStrava(
      `https://www.strava.com/athletes/${athleteId}/interval?interval=${ym}&interval_type=month&chart_type=miles&year_offset=0`,
      {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );

    if (!res.ok) return { activities: 0, distance_km: 0, elev_gain_m: 0, time: "0h 0m" };

    const text = await res.text();
    const totalsMatch = text.match(/jQuery\("#totals"\)\.html\("([\s\S]*?)"\);/);
    if (!totalsMatch) return { activities: 0, distance_km: 0, elev_gain_m: 0, time: "0h 0m" };

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
    return { activities: 0, distance_km: 0, elev_gain_m: 0, time: "0h 0m" };
  }
}

// Récupérer les stats annuelles YTD
async function fetchAthleteAnnualStats(athleteId) {
  try {
    const res = await fetchStrava(
      `https://www.strava.com/athletes/${athleteId}/profile_sidebar_comparison?hl=en-US`,
      {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );

    if (!res.ok) return { activities: 0, distance_km: 0, elev_gain_m: 0, time: "0h 0m" };
    const html = await res.text();
    const sport0Match = html.match(/<div class=['"][^"']*sport-0[\s\S]*?<\/table>/);
    if (!sport0Match) return { activities: 0, distance_km: 0, elev_gain_m: 0, time: "0h 0m" };

    const s0 = sport0Match[0];
    const ytdMatch = s0.match(/<tbody id=['"]sport-0-ytd['"]>([\s\S]*?)<\/tbody>/);
    const ytdBlock = ytdMatch ? ytdMatch[1] : "";

    function extractCell(block, label) {
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

// Récupérer le classement d'un segment Strava spécifique (ex: segment du mois SPS)
async function fetchSegmentLeaderboard(segmentId = "42510565") {
  try {
    const res = await fetchStrava(`https://www.strava.com/segments/${segmentId}`);
    if (!res.ok) return null;
    const text = await res.text();
    const nextDataMatch = text.match(/<script id=\"__NEXT_DATA__\" type=\"application\/json\">([\s\S]*?)<\/script>/);
    if (!nextDataMatch) return null;
    const data = JSON.parse(nextDataMatch[1]);
    const p = data.props?.pageProps;
    if (!p) return null;

    const lb = (p.initialLeaderboard?.leaderboard || []).map((e, idx) => {
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
        athleteId: String(e.athleteId || ""),
        avatar: e.avatarUrl || null,
        timeSeconds: timeSec,
        timeFormatted,
        speedKmh: Math.round((((e.speed || 0) * 3.6) * 10)) / 10,
        date: e.startDateLocal || "",
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

async function main() {
  const args = process.argv.slice(2);
  const targetMonths = ["2026-10", "2026-11"];

  console.log("=========================================================");
  console.log("       STATISTIQUES OFFICIELLES STRAVA - CLUB SPS       ");
  console.log("=========================================================");

  const membersList = Object.entries(SPS_MEMBER_STRAVA_MAPPINGS).map(([officialName, info]) => ({
    officialName,
    athleteId: info.id,
    stravaName: info.stravaName,
  }));

  console.log(`👥 Adhérents officiels SPS : ${membersList.length}`);
  console.log(`📅 Mois calendaires à scraper : ${targetMonths.join(", ")}`);
  console.log(`⏳ Récupération en cours (Annuel + Mois calendaires)...`);

  const membersResults = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < membersList.length; i += BATCH_SIZE) {
    const batch = membersList.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (m) => {
        const annual = await fetchAthleteAnnualStats(m.athleteId);
        const monthsData = {};

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

    process.stdout.write(`   Progression : ${Math.min(i + BATCH_SIZE, membersList.length)}/${membersList.length}...\r`);
    await sleep(100);
  }
  console.log("\n   Données Strava récupérées avec succès !\n");

  // Calcul des classements mensuels
  const monthlyLeaders = {};

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
  console.log("🚴 Récupération du segment du mois SPS (42510565)...");
  const segment = await fetchSegmentLeaderboard("42510565");
  if (segment) {
    console.log(`✅ Segment récupéré : ${segment.name} (${segment.leaderboard.length} coureurs classés)`);
  }

  // Sauvegarde des données
  const store = {
    extractedAt: new Date().toISOString(),
    totalOfficialMembers: membersList.length,
    totalMatched: membersResults.length,
    members: membersResults,
    monthlyLeaders,
    segmentOfMonth: segment || existingStore?.segmentOfMonth,
  };

  const outPath = path.join(ROOT_DIR, "data/strava_sps_stats.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(store, null, 2));

  // Affichage Octobre 2026 (Mois calendaire strict)
  const octStats = monthlyLeaders["2026-10"];
  if (octStats) {
    console.log("==========================================================================================");
    console.log("                 🏆 CLASSEMENT MENSUEL CALENDAIRE : OCTOBRE 2026                          ");
    console.log("==========================================================================================");
    console.log(
      `Cumul Octobre 2026 : ${octStats.totalKm.toLocaleString("fr-FR")} km | ${octStats.totalActivities} sorties | ${octStats.totalElevation.toLocaleString(
        "fr-FR"
      )} m D+`
    );
    console.log("\n--- TOP 10 ROULEURS DU MOIS (OCTOBRE 2026 - DISTANCE) ---");
    octStats.topDistance.slice(0, 10).forEach((m) => {
      console.log(
        `${String(m.rank).padStart(2)}. ${m.officialName.padEnd(25)} : ${m.distance_km.toLocaleString(
          "fr-FR"
        )} km (${m.activities} sorties)`
      );
    });

    console.log("\n--- TOP 10 GRIMPEURS DU MOIS (OCTOBRE 2026 - D+) ---");
    octStats.topElevation.slice(0, 10).forEach((m) => {
      console.log(
        `${String(m.rank).padStart(2)}. ${m.officialName.padEnd(25)} : ${m.elev_gain_m.toLocaleString(
          "fr-FR"
        )} m D+ (${m.activities} sorties)`
      );
    });
    console.log("==========================================================================================\n");
  }

  console.log(`📁 Fichier JSON complet sauvegardé dans : ${outPath}`);
}

main().catch(console.error);
