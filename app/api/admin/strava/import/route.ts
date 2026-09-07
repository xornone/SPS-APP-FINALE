import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import {
  buildGpxFromStreams,
  extractStravaResource,
  fetchStravaActivityStreams,
  fetchStravaRouteGpx,
  getValidAccessToken,
} from "@/lib/strava";

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { activityUrl } = await request.json();
    const resource = extractStravaResource(activityUrl || "");
    if (!resource) {
      return NextResponse.json(
        {
          error:
            "Lien Strava invalide (ex : https://www.strava.com/routes/1234567890 ou https://www.strava.com/activities/1234567890).",
        },
        { status: 400 }
      );
    }

    // Toujours le token de l'admin appelant — jamais celui d'un autre
    // admin : impossible d'importer avec le compte Strava de quelqu'un
    // d'autre, meme en manipulant la requete.
    const accessToken = await getValidAccessToken(guard.user.id);

    // Une "route" (parcours planifie, pas encore effectue) a son propre
    // endpoint d'export GPX cote Strava — pas besoin de reconstruire le
    // fichier a partir de streams comme pour une "activity" (deja
    // effectuee). Les sorties du club sont le plus souvent partagees comme
    // une route.
    const gpxText =
      resource.type === "route"
        ? await fetchStravaRouteGpx(accessToken, resource.id)
        : buildGpxFromStreams(
            await fetchStravaActivityStreams(accessToken, resource.id),
            `Sortie SPS — activité Strava ${resource.id}`
          );

    return NextResponse.json({ ok: true, gpxText, stravaId: resource.id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Import Strava impossible." }, { status: 400 });
  }
}
