import { NextResponse } from "next/server";
import { sendTomorrowRidesReminders } from "@/lib/rideReminder";

export const dynamic = "force-dynamic";

/**
 * Route appelée quotidiennement (ex: 19h00) par Vercel Cron
 * Détecte les sorties du lendemain et envoie les notifications push de rappel.
 */
export async function GET(request: Request) {
  try {
    // Vérification optionnelle de sécurité si CRON_SECRET est configuré
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const results = await sendTomorrowRidesReminders();
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      remindersSent: results.length,
      details: results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cron/ride-reminders] Erreur :", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
