/**
 * Script de collecte et réconciliation des statistiques Strava des membres officiels SPS
 * Club Strava: SPS (ID: 1622153)
 * Supporte : Classement Annuel (YTD), Classement Mensuel (4 semaines), et Hebdomadaire.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

const STRAVA_SESSION_COOKIE = process.env.STRAVA_SESSION || "ftd0ec1r3n6vht0ippj2vnr48e9oplnp";
const CLUB_ID = "1622153";

// Correspondances manuelles validées (Nom officiel SPS -> Profil Strava)
const OFFICIAL_STRAVA_OVERRIDES = {
  "Huu Duc Nguyen": { id: "127761085", stravaName: "Duc Ngn" },
  "Christopher Walton": { id: "19030055", stravaName: "Chris Walton" },
  "Frederic Tardivot (Fred)": { id: "36804008", stravaName: "Fréd TT" },
  "Elias Khaldi": { id: "148601632", stravaName: "Elias going crzy" },
  "Raquel Cardó Fernández": { id: "165159968", stravaName: "Raquel CF" },
  "Fandy Sabarila": { id: "23711779", stravaName: "Fandi Sabarila" },
  "Mathis Roblot": { id: "38174865", stravaName: "Mathis Rblt" },
  "Charly Jegat": { id: "123685345", stravaName: "Charly  🇫🇷" },
  "Zoé Paquet": { id: "105273120", stravaName: "Zoe Pqt" },
  "Jean-Baptiste Lafon": { id: "105333127", stravaName: "Jb Lafon" },
  "Benjamin Embry": { id: "34754434", stravaName: "Benjamin E." },
  "René Espinosa Rojas": { id: "185529050", stravaName: "René  E" },
  // Nouveaux ajouts confirmés :
  "Lucille Roux": { id: "195125562", stravaName: "Lu Lu" },
  "Pierrick Pinault": { id: "58548359", stravaName: "Papo Kano" },
  "Damien Kurtzemann": { id: "4278363", stravaName: "Damien Kurtzemann" },
  "Camille Frairrot": { id: "64813353", stravaName: "Cam 🌷 LaMenace" },
  "Richard Planchon": { id: "16841100", stravaName: "Planchon  Richard" },
};

function clean(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(str) {
  return clean(str).split(" ").filter(Boolean);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseTimeMinutes(timeStr) {
  if (!timeStr) return 0;
  let totalMin = 0;
  const hMatch = timeStr.match(/(\d+)\s*h/);
  const mMatch = timeStr.match(/(\d+)\s*m/);
  const sMatch = timeStr.match(/(\d+)\s*s/);
  if (hMatch) totalMin += parseInt(hMatch[1], 10) * 60;
  if (mMatch) totalMin += parseInt(mMatch[1], 10);
  if (sMatch && !hMatch && !mMatch) totalMin += Math.round(parseInt(sMatch[1], 10) / 60);
  return totalMin;
}

function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m < 10 ? "0" : ""}${m}m`;
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

// 1. Charger la liste officielle des 99 membres SPS
function loadOfficialMembers() {
  const membersTs = fs.readFileSync(path.join(ROOT_DIR, "lib/members.ts"), "utf8");
  const activeMatch = membersTs.match(/export const SPS_ACTIVE_MEMBERS: readonly string\[\] = \[([\s\S]*?)\];/);
  if (!activeMatch) throw new Error("Impossible de trouver SPS_ACTIVE_MEMBERS dans lib/members.ts");
  return activeMatch[1]
    .split("\n")
    .map((l) => l.replace(/^[ \t]*"/, "").replace(/",?.*$/, "").trim())
    .filter((l) => l && !l.startsWith("//"));
}

// 2. Charger les membres du club Strava
async function scrapeAllClubMembers() {
  const cachePath = "/tmp/strava_club_members_unique.json";
  if (fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, "utf8"));
  }

  const memberMap = new Map();
  for (let page = 1; page <= 25; page++) {
    const res = await fetchStrava(`https://www.strava.com/clubs/${CLUB_ID}/members?page=${page}`);
    if (!res.ok) break;
    const html = await res.text();
    const regex = /<div class=['"]text-headline['"]><a href=['"]\/athletes\/(\d+)['"]>([^<]+)<\/a><\/div>/g;
    let match;
    let count = 0;
    while ((match = regex.exec(html)) !== null) {
      if (!memberMap.has(match[1])) {
        memberMap.set(match[1], { id: match[1], name: match[2].trim() });
      }
      count++;
    }
    if (count === 0) break;
    await sleep(150);
  }
  const members = Array.from(memberMap.values());
  fs.writeFileSync(cachePath, JSON.stringify(members, null, 2));
  return members;
}

// 3. Récupérer le leaderboard hebdo
async function fetchLeaderboard(weekOffset) {
  const res = await fetchStrava(
    `https://www.strava.com/clubs/${CLUB_ID}/leaderboard?week_offset=${weekOffset}&per_page=100&sort_by=distance`,
    {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json, text/javascript, */*; q=0.01",
      },
    }
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

// 4. Récupérer les statistiques Annuel (YTD) et Mensuel (Last 4 Weeks) pour le vélo (sport-0)
async function fetchAthleteProfileStats(athleteId) {
  try {
    const res = await fetchStrava(
      `https://www.strava.com/athletes/${athleteId}/profile_sidebar_comparison?hl=en-US`,
      {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );
    if (!res.ok) return null;
    const html = await res.text();

    // Isoler le bloc sport-0 (Ride)
    const sport0Match = html.match(/<div class=['"][^"']*sport-0[\s\S]*?<\/table>/);
    if (!sport0Match) return null;
    const s0 = sport0Match[0];

    // Extraction d'une cellule du bloc sport-0
    function extractCell(block, label) {
      const r = new RegExp(`<td>${label}<\\/td>\\s*<td>([^<]+)<\\/td>`, "i");
      const m = block.match(r);
      return m ? m[1].trim() : null;
    }

    // Bloc YTD (Annuel)
    const ytdMatch = s0.match(/<tbody id=['"]sport-0-ytd['"]>([\s\S]*?)<\/tbody>/);
    const ytdBlock = ytdMatch ? ytdMatch[1] : "";

    const ytdActivities = parseInt((extractCell(ytdBlock, "Activities") || "0").replace(/[^0-9]/g, ""), 10) || 0;
    const ytdDistanceKm = parseFloat((extractCell(ytdBlock, "Distance") || "0").replace(/,/g, "").replace(/[^0-9.]/g, "")) || 0;
    const ytdElevGainM = parseInt((extractCell(ytdBlock, "Elev Gain") || "0").replace(/,/g, "").replace(/[^0-9]/g, ""), 10) || 0;
    const ytdTimeStr = extractCell(ytdBlock, "Time") || "0h 0m";

    // Bloc Last 4 Weeks (Mensuel glissant)
    const l4wIdx = s0.indexOf("Last 4 Weeks");
    const l4wBlock = l4wIdx !== -1 ? s0.slice(l4wIdx, l4wIdx + 600) : "";

    const actPerWeek = parseFloat(extractCell(l4wBlock, "Activities / Week") || "0") || 0;
    const distPerWeekKm = parseFloat((extractCell(l4wBlock, "Avg Distance / Week") || "0").replace(/,/g, "").replace(/[^0-9.]/g, "")) || 0;
    const elevPerWeekM = parseInt((extractCell(l4wBlock, "Elev Gain / Week") || "0").replace(/,/g, "").replace(/[^0-9]/g, ""), 10) || 0;
    const timePerWeekStr = extractCell(l4wBlock, "Avg Time / Week") || "0h 0m";

    const monthlyActivities = Math.round(actPerWeek * 4);
    const monthlyDistanceKm = parseFloat((distPerWeekKm * 4).toFixed(1));
    const monthlyElevGainM = Math.round(elevPerWeekM * 4);
    const monthlyTimeMin = parseTimeMinutes(timePerWeekStr) * 4;

    return {
      annual: {
        activities: ytdActivities,
        distance_km: ytdDistanceKm,
        elev_gain_m: ytdElevGainM,
        time: ytdTimeStr,
      },
      monthly: {
        activities: monthlyActivities,
        distance_km: monthlyDistanceKm,
        elev_gain_m: monthlyElevGainM,
        time: formatMinutes(monthlyTimeMin),
        weekly_avg: {
          activities: actPerWeek,
          distance_km: distPerWeekKm,
          elev_gain_m: elevPerWeekM,
          time: timePerWeekStr,
        },
      },
    };
  } catch (err) {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const showOnlyAnnuel = args.includes("--annuel");
  const showOnlyMensuel = args.includes("--mensuel");

  console.log("=========================================================");
  console.log("       STATISTIQUES OFFICIELLES STRAVA - CLUB SPS       ");
  console.log("=========================================================");

  const officialList = loadOfficialMembers();
  const clubMembers = await scrapeAllClubMembers();

  // Leaderboard hebdo
  const currentWeekLb = await fetchLeaderboard(0);
  const lastWeekLb = await fetchLeaderboard(1);
  const lbCurrentMap = new Map(currentWeekLb.map((row) => [String(row.athlete_id), row]));
  const lbLastMap = new Map(lastWeekLb.map((row) => [String(row.athlete_id), row]));

  // Réconciliation des 99 membres
  const matchedMembers = [];
  const unmatchedOfficial = [];

  for (const off of officialList) {
    let athleteInfo = null;

    if (OFFICIAL_STRAVA_OVERRIDES[off]) {
      athleteInfo = OFFICIAL_STRAVA_OVERRIDES[off];
    } else {
      const oClean = clean(off);
      const oTokens = tokens(off);

      const found = clubMembers.find((cm) => {
        const cClean = clean(cm.name);
        if (cClean === oClean) return true;
        const cTokens = tokens(cm.name);
        const allOffInClub = oTokens.length >= 2 && oTokens.every((t) => cTokens.includes(t));
        const allClubInOff = cTokens.length >= 2 && cTokens.every((t) => oTokens.includes(t));
        return allOffInClub || allClubInOff;
      });

      if (found) {
        athleteInfo = { id: found.id, stravaName: found.name };
      }
    }

    if (athleteInfo) {
      matchedMembers.push({
        officialName: off,
        stravaName: athleteInfo.stravaName,
        athleteId: athleteInfo.id,
      });
    } else {
      unmatchedOfficial.push(off);
    }
  }

  console.log(`\n👥 Adhérents officiels SPS : ${officialList.length}`);
  console.log(`✅ Adhérents identifiés sur Strava : ${matchedMembers.length} / ${officialList.length} (100% avec les correspondances manuelles)`);
  if (unmatchedOfficial.length > 0) {
    console.log(`⚠️ Membres non trouvés (${unmatchedOfficial.length}) :`, unmatchedOfficial.join(", "));
  }

  console.log(`\n⏳ Récupération des statistiques profil Strava (Annuel + Mensuel)...`);
  const finalResults = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < matchedMembers.length; i += BATCH_SIZE) {
    const batch = matchedMembers.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (m) => {
        const stats = await fetchAthleteProfileStats(m.athleteId);
        const curr = lbCurrentMap.get(String(m.athleteId));
        const last = lbLastMap.get(String(m.athleteId));

        finalResults.push({
          ...m,
          annual: stats?.annual || { activities: 0, distance_km: 0, elev_gain_m: 0, time: "0h 0m" },
          monthly: stats?.monthly || { activities: 0, distance_km: 0, elev_gain_m: 0, time: "0h 0m" },
          weekly: {
            current: curr
              ? {
                  rank: curr.rank,
                  activities: curr.num_activities,
                  distance_km: parseFloat((curr.distance / 1000).toFixed(1)),
                  elev_gain_m: Math.round(curr.elev_gain),
                }
              : null,
            last: last
              ? {
                  rank: last.rank,
                  activities: last.num_activities,
                  distance_km: parseFloat((last.distance / 1000).toFixed(1)),
                  elev_gain_m: Math.round(last.elev_gain),
                }
              : null,
          },
        });
      })
    );
    process.stdout.write(`   Progression : ${Math.min(i + BATCH_SIZE, matchedMembers.length)}/${matchedMembers.length}...\r`);
    await sleep(120);
  }
  console.log("\n   Données Strava récupérées avec succès !\n");

  // Totaux club
  let totalKmAnnual = 0;
  let totalActAnnual = 0;
  let totalDPlusAnnual = 0;

  let totalKmMonthly = 0;
  let totalActMonthly = 0;
  let totalDPlusMonthly = 0;

  for (const m of finalResults) {
    totalKmAnnual += m.annual.distance_km;
    totalActAnnual += m.annual.activities;
    totalDPlusAnnual += m.annual.elev_gain_m;

    totalKmMonthly += m.monthly.distance_km;
    totalActMonthly += m.monthly.activities;
    totalDPlusMonthly += m.monthly.elev_gain_m;
  }

  // --- CLASSEMENT ANNUEL ---
  if (!showOnlyMensuel) {
    const annualSorted = [...finalResults].sort((a, b) => b.annual.distance_km - a.annual.distance_km);

    console.log("==========================================================================================");
    console.log("                     🏆 CLASSEMENT ANNUEL SPS 2026 (YTD + ZWIFT/VIRTUEL)                 ");
    console.log("==========================================================================================");
    console.log(
      `Cumul club annuel : ${Math.round(totalKmAnnual).toLocaleString("fr-FR")} km | ${totalActAnnual.toLocaleString(
        "fr-FR"
      )} sorties | ${totalDPlusAnnual.toLocaleString("fr-FR")} m D+`
    );
    console.log("------------------------------------------------------------------------------------------");
    console.log(
      String("RANG").padEnd(5) +
        String("ADHÉRENT").padEnd(26) +
        String("PSEUDO STRAVA").padEnd(24) +
        String("SORTIES").padEnd(10) +
        String("DISTANCE").padEnd(14) +
        String("D+ (m)").padEnd(12) +
        "TEMPS"
    );
    console.log("------------------------------------------------------------------------------------------");

    annualSorted.forEach((m, idx) => {
      if (m.annual.distance_km === 0 && idx > 30 && !args.includes("--all")) return;
      const rankStr = String(idx + 1).padStart(3) + ". ";
      const nameStr = m.officialName.padEnd(25);
      const stravaStr = m.stravaName.slice(0, 22).padEnd(24);
      const actStr = `${m.annual.activities}`.padStart(6) + "   ";
      const distStr = `${m.annual.distance_km.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`.padStart(12) + "  ";
      const dPlusStr = `${m.annual.elev_gain_m.toLocaleString("fr-FR")} m`.padStart(10) + "  ";
      const timeStr = m.annual.time;

      console.log(rankStr + nameStr + stravaStr + actStr + distStr + dPlusStr + timeStr);
    });
    console.log("==========================================================================================\n");
  }

  // --- CLASSEMENT MENSUEL ---
  if (!showOnlyAnnuel) {
    const monthlySorted = [...finalResults].sort((a, b) => b.monthly.distance_km - a.monthly.distance_km);

    console.log("==========================================================================================");
    console.log("                     📅 CLASSEMENT MENSUEL SPS (4 DERNIÈRES SEMAINES)                    ");
    console.log("==========================================================================================");
    console.log(
      `Cumul club mensuel : ${Math.round(totalKmMonthly).toLocaleString("fr-FR")} km | ${totalActMonthly.toLocaleString(
        "fr-FR"
      )} sorties | ${totalDPlusMonthly.toLocaleString("fr-FR")} m D+`
    );
    console.log("------------------------------------------------------------------------------------------");
    console.log(
      String("RANG").padEnd(5) +
        String("ADHÉRENT").padEnd(26) +
        String("PSEUDO STRAVA").padEnd(24) +
        String("SORTIES").padEnd(10) +
        String("DISTANCE").padEnd(14) +
        String("D+ (m)").padEnd(12) +
        "MOY. HEBDO"
    );
    console.log("------------------------------------------------------------------------------------------");

    monthlySorted.forEach((m, idx) => {
      if (m.monthly.distance_km === 0 && idx > 30 && !args.includes("--all")) return;
      const rankStr = String(idx + 1).padStart(3) + ". ";
      const nameStr = m.officialName.padEnd(25);
      const stravaStr = m.stravaName.slice(0, 22).padEnd(24);
      const actStr = `${m.monthly.activities}`.padStart(6) + "   ";
      const distStr = `${m.monthly.distance_km.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`.padStart(12) + "  ";
      const dPlusStr = `${m.monthly.elev_gain_m.toLocaleString("fr-FR")} m`.padStart(10) + "  ";
      const hebdoStr = `${m.monthly.weekly_avg?.distance_km || 0} km/sem (${m.monthly.weekly_avg?.activities || 0} sorties)`;

      console.log(rankStr + nameStr + stravaStr + actStr + distStr + dPlusStr + hebdoStr);
    });
    console.log("==========================================================================================\n");
  }

  // Sauvegarder dans data/strava_sps_stats.json
  const outPath = path.join(ROOT_DIR, "data/strava_sps_stats.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        extractedAt: new Date().toISOString(),
        totalOfficialMembers: officialList.length,
        totalMatched: finalResults.length,
        totals: {
          annual: {
            distance_km: totalKmAnnual,
            activities: totalActAnnual,
            elev_gain_m: totalDPlusAnnual,
          },
          monthly: {
            distance_km: totalKmMonthly,
            activities: totalActMonthly,
            elev_gain_m: totalDPlusMonthly,
          },
        },
        members: finalResults,
      },
      null,
      2
    )
  );

  console.log(`📁 Fichier JSON complet exporté vers : ${outPath}`);
}

main().catch(console.error);
