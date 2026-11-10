import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { isSuperAdmin } from "@/lib/notificationAdmins";
import { checkStravaSessionStatus } from "@/lib/stravaScraper";

export const dynamic = "force-dynamic";

/**
 * Route GET /api/admin/strava/status
 * Vérifie si le cookie _strava4_session configuré est actuellement authentifié sur Strava.
 * Réservé exclusivement au Super Admin (th.tregaro@gmail.com).
 */
export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    if (!isSuperAdmin(guard.user.email)) {
      return NextResponse.json(
        { error: "Action réservée à l'administrateur principal (th.tregaro@gmail.com)." },
        { status: 403 }
      );
    }

    const result = await checkStravaSessionStatus();

    return NextResponse.json({
      ...result,
      checkedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, connected: false, error: msg }, { status: 500 });
  }
}
