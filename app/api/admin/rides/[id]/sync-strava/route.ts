import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminGuard";
import {
  extractStravaResource,
  fetchStravaActivityMetadata,
  fetchStravaRouteMetadata,
  getValidAccessToken,
} from "@/lib/strava";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { supabase, user } = guard;

  try {
    const { data: ride, error: fetchErr } = await supabase
      .from("rides")
      .select("id, title, strava_url, distance_km, elevation_gain_m")
      .eq("id", params.id)
      .single();

    if (fetchErr || !ride) {
      return NextResponse.json({ error: "Sortie introuvable." }, { status: 404 });
    }

    if (!ride.strava_url) {
      return NextResponse.json({ error: "Cette sortie n'a pas de lien Strava associé." }, { status: 400 });
    }

    const resource = extractStravaResource(ride.strava_url);
    if (!resource) {
      return NextResponse.json({ error: "Lien Strava invalide." }, { status: 400 });
    }

    const accessToken = await getValidAccessToken(user.id);

    const metadata =
      resource.type === "route"
        ? await fetchStravaRouteMetadata(accessToken, resource.id)
        : await fetchStravaActivityMetadata(accessToken, resource.id);

    const { error: updateErr } = await supabase
      .from("rides")
      .update({
        distance_km: metadata.distanceKm,
        elevation_gain_m: metadata.elevationGainM,
      })
      .eq("id", params.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    revalidatePath("/home");
    revalidatePath(`/rides/${params.id}`);
    revalidatePath("/admin");

    return NextResponse.json({
      ok: true,
      distance_km: metadata.distanceKm,
      elevation_gain_m: metadata.elevationGainM,
      message: `Sortie synchronisée : ${metadata.distanceKm} km et ${metadata.elevationGainM} m D+ (Strava).`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Synchronisation Strava impossible." }, { status: 400 });
  }
}
