import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { stravaAuthorizeUrl } from "@/lib/strava";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    return NextResponse.redirect(stravaAuthorizeUrl());
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Configuration Strava manquante." }, { status: 500 });
  }
}
