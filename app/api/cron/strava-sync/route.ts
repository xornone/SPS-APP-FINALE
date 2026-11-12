import { NextResponse } from "next/server";
import { syncAllMembersStravaStats } from "@/lib/stravaScraper";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Route appelée automatiquement toutes les 48h (à 04h00 UTC) par Vercel Cron.
 * Scrape uniquement le mois en cours pour rester furtif et diviser par 2 les requêtes,
 * tout en conservant intacts les classements des mois précédents déjà enregistrés.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const targetMonths = [currentMonthKey];
    console.log("[cron/strava-sync] Exécution automatique furtive 48h pour :", targetMonths);

    const store = await syncAllMembersStravaStats(targetMonths);

    return NextResponse.json({
      ok: true,
      timestamp: store.extractedAt,
      membersUpdated: store.totalMatched,
      targetMonths,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cron/strava-sync] Erreur :", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
