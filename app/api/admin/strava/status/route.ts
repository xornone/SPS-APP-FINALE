import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { isSuperAdmin } from "@/lib/notificationAdmins";
import { getSessionCookie } from "@/lib/stravaScraper";

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

    const cookie = getSessionCookie();

    // On teste l'accès à la page des paramètres de profil Strava
    const res = await fetch("https://www.strava.com/settings/profile", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Cookie: `_strava4_session=${cookie}`,
      },
      redirect: "manual",
      cache: "no-store",
    });

    const isConnected = res.status === 200;
    const location = res.headers.get("location");

    return NextResponse.json({
      ok: true,
      connected: isConnected,
      status: res.status,
      redirect: location,
      checkedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, connected: false, error: msg }, { status: 500 });
  }
}
