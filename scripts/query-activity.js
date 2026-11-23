#!/usr/bin/env node

/**
 * Script de consultation du journal d'activité SPS (activity_logs).
 * Permet à Antigravity de retrouver immédiatement qui a fait quoi.
 *
 * Usage:
 *   node scripts/query-activity.js [--limit 20] [--member "Florian"] [--action "set_captain"] [--ride "0b2c..."]
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Charger .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
const env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[match[1].trim()] = val;
    }
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Préférer serviceKey si présente, sinon anonKey
const supabase = createClient(supabaseUrl, serviceKey && !serviceKey.includes("...") ? serviceKey : anonKey);

// Parse arguments
const args = process.argv.slice(2);
function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const limit = parseInt(getArg("--limit") || "20", 10);
const memberFilter = getArg("--member");
const actionFilter = getArg("--action");
const rideFilter = getArg("--ride");
const ipFilter = getArg("--ip");

async function run() {
  let query = supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (memberFilter) {
    query = query.ilike("actor_name", `%${memberFilter}%`);
  }
  if (actionFilter) {
    query = query.eq("action", actionFilter);
  }
  if (rideFilter) {
    query = query.eq("target_id", rideFilter);
  }
  if (ipFilter) {
    query = query.eq("ip_address", ipFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Erreur lors de la lecture d'activity_logs:", error.message);
    if (error.code === "PGRST205" || error.message.includes("does not exist")) {
      console.log("\n⚠️ La table activity_logs n'a pas encore été créée dans Supabase.");
      console.log("➡️ Exécute la migration supabase/migrations/0017_activity_logs.sql dans le SQL Editor de Supabase.");
    }
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("Aucune activité trouvée avec ces filtres.");
    return;
  }

  console.log(`\n📜 Journal d'activité SPS (${data.length} entrées récentes) :\n`);
  for (const item of data) {
    const date = new Date(item.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
    const actorBadge = item.actor_type === "admin" ? "👑 ADMIN" : "👤 MEMBRE";
    const emailStr = item.actor_email ? ` (${item.actor_email})` : "";
    const ipStr = item.ip_address ? ` [IP: ${item.ip_address}]` : "";

    console.log(`• [${date}] ${actorBadge} ${item.actor_name}${emailStr}${ipStr}`);
    console.log(`  Action : ${item.action} | Cible : ${item.target_type} ${item.target_title || item.target_id || ""}`);
    if (item.details && Object.keys(item.details).length > 0) {
      console.log(`  Détails : ${JSON.stringify(item.details)}`);
    }
    console.log("");
  }
}

run();
