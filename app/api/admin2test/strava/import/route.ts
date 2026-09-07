import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import {
  buildGpxFromStreams,
  extractStravaActivityId,
  fetchStravaActivityStreams,
  getValidAccessToken,
  isStravaTestAdmin,
} from "@/lib/stravaTest";

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { adminName, activityUrl } = await request.json();
    if (!isStravaTestAdmin(adminName)) {
      return NextResponse.json({ error: "Choisis un admin connecté à Strava." }, { status: 400 });
    }
    const activityId = extractStravaActivityId(activityUrl || "");
    if (!activityId) {
      return NextResponse.json(
        { error: "Lien Strava invalide (ex : https://www.strava.com/activities/1234567890)." },
        { status: 400 }
      );
    }

    const accessToken = await getValidAccessToken(adminName);
    const streams = await fetchStravaActivityStreams(accessToken, activityId);
    const gpxText = buildGpxFromStreams(streams, `Sortie SPS — activité Strava ${activityId}`);

    return NextResponse.json({ ok: true, gpxText, activityId });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Import Strava impossible." }, { status: 400 });
  }
}
