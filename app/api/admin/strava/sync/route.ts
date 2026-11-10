import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { syncAllMembersStravaStats, getCachedStravaData } from "@/lib/stravaScraper";
import { isSuperAdmin } from "@/lib/notificationAdmins";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 secondes max pour Vercel serverless

export async function POST(request: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    // Réservé exclusivement au Super Admin (th.tregaro@gmail.com)
    if (!isSuperAdmin(guard.user.email)) {
      return NextResponse.json(
        { error: "Action réservée à l'administrateur principal (th.tregaro@gmail.com)." },
        { status: 403 }
      );
    }

    let targetMonths = ["2026-10", "2026-11"];
    try {
      const body = await request.json();
      if (body?.months && Array.isArray(body.months)) {
        targetMonths = body.months;
      }
    } catch {
      // Pas de corps JSON, utilisation des mois par défaut
    }

    console.log("[api/admin/strava/sync] Démarrage de la synchronisation Strava pour les mois :", targetMonths);
    const store = await syncAllMembersStravaStats(targetMonths);

    return NextResponse.json({
      ok: true,
      timestamp: store.extractedAt,
      totalMatched: store.totalMatched,
      monthlyLeaders: store.monthlyLeaders,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/strava/sync] Erreur :", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const cached = getCachedStravaData();
    return NextResponse.json({ ok: true, data: cached });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
