import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { disconnectStrava, isStravaTestAdmin } from "@/lib/stravaTest";

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { adminName } = await request.json();
    if (!isStravaTestAdmin(adminName)) {
      return NextResponse.json({ error: "Admin inconnu pour ce test Strava." }, { status: 400 });
    }
    await disconnectStrava(adminName);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue." }, { status: 500 });
  }
}
