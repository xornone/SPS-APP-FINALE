import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { fetchAthleteRoutes, getValidAccessToken } from "@/lib/strava";

// Liste les traces (routes) enregistrees sur le compte Strava de l'admin
// appelant, pour le menu deroulant du formulaire de sortie — toujours ses
// propres traces, jamais celles d'un autre admin.
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const accessToken = await getValidAccessToken(guard.user.id);
    const routes = await fetchAthleteRoutes(accessToken);
    return NextResponse.json({ ok: true, routes });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Impossible de récupérer tes traces Strava." }, { status: 400 });
  }
}
