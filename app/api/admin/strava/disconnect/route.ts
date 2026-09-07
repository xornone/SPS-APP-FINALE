import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { disconnectStrava } from "@/lib/strava";

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { athleteId } = await request.json();
    if (typeof athleteId !== "number") {
      return NextResponse.json({ error: "athleteId manquant." }, { status: 400 });
    }
    await disconnectStrava(athleteId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue." }, { status: 500 });
  }
}
