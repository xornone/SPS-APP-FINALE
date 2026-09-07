import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { isStravaTestAdmin, stravaAuthorizeUrl } from "@/lib/stravaTest";

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { searchParams } = new URL(request.url);
  const admin = searchParams.get("admin") || "";
  if (!isStravaTestAdmin(admin)) {
    return NextResponse.json({ error: "Admin inconnu pour ce test Strava." }, { status: 400 });
  }

  try {
    return NextResponse.redirect(stravaAuthorizeUrl(admin));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Configuration Strava manquante." }, { status: 500 });
  }
}
