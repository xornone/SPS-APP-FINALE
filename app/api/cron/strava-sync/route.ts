import { NextResponse } from "next/server";
import { syncAllMembersStravaStats } from "@/lib/stravaScraper";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Route appelée automatiquement chaque dimanche à 21h00 par Vercel Cron.
 * Scrape les sorties du mois en cours et du mois précédent pour mettre à jour
 * le classement Grimpeur du mois et Rouleur du mois.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

    const targetMonths = [prevMonthKey, currentMonthKey];
    console.log("[cron/strava-sync] Exécution automatique hebdomadaire (dimanche 21h) pour :", targetMonths);

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
