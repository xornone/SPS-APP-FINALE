import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import {
  buildGpxFromStreams,
  extractStravaResource,
  fetchStravaActivityMetadata,
  fetchStravaActivityStreams,
  fetchStravaRouteGpx,
  fetchStravaRouteMetadata,
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

    let gpxText = "";
    let distanceKm: number | undefined;
    let elevationGainM: number | undefined;
    let name: string | undefined;

    if (resource.type === "route") {
      const [gpx, meta] = await Promise.all([
        fetchStravaRouteGpx(accessToken, resource.id),
        fetchStravaRouteMetadata(accessToken, resource.id).catch((err) => {
          console.warn("Could not fetch route metadata from Strava:", err);
          return null;
        }),
      ]);
      gpxText = gpx;
      if (meta) {
        distanceKm = meta.distanceKm;
        elevationGainM = meta.elevationGainM;
        name = meta.name;
      }
    } else {
      const [streams, meta] = await Promise.all([
        fetchStravaActivityStreams(accessToken, resource.id),
        fetchStravaActivityMetadata(accessToken, resource.id).catch((err) => {
          console.warn("Could not fetch activity metadata from Strava:", err);
          return null;
        }),
      ]);
      gpxText = buildGpxFromStreams(
        streams,
        `Sortie SPS — activité Strava ${resource.id}`
      );
      if (meta) {
        distanceKm = meta.distanceKm;
        elevationGainM = meta.elevationGainM;
        name = meta.name;
      }
    }

    return NextResponse.json({
      ok: true,
      gpxText,
      stravaId: resource.id,
      distanceKm,
      elevationGainM,
      name,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Import Strava impossible." }, { status: 400 });
  }
}
