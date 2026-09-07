import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import {
  buildGpxFromStreams,
  extractStravaActivityId,
  fetchStravaActivityStreams,
  getValidAccessToken,
} from "@/lib/strava";

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { athleteId, activityUrl } = await request.json();
    if (typeof athleteId !== "number") {
      return NextResponse.json({ error: "Choisis un compte Strava connecté." }, { status: 400 });
    }
    const activityId = extractStravaActivityId(activityUrl || "");
    if (!activityId) {
      return NextResponse.json(
        { error: "Lien Strava invalide (ex : https://www.strava.com/activities/1234567890)." },
        { status: 400 }
      );
    }

    const accessToken = await getValidAccessToken(athleteId);
    const streams = await fetchStravaActivityStreams(accessToken, activityId);
    const gpxText = buildGpxFromStreams(streams, `Sortie SPS — activité Strava ${activityId}`);

    return NextResponse.json({ ok: true, gpxText, activityId });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Import Strava impossible." }, { status: 400 });
  }
}
