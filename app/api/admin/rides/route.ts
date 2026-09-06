import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminGuard";

const GROUP_SPEED: Record<string, string> = {
  vert: "24–26 km/h",
  rouge: "26–28 km/h",
  violet: "28+ km/h",
};

export async function POST(request: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { supabase, user } = guard;

    const body = await request.json();
    const { title, description, ride_date, ride_time, place, place_url, distance_km, elevation_gain_m, strava_url, groups } = body;

    if (!title || !ride_date || !ride_time || !place || !groups?.length) {
      return NextResponse.json({ error: "Champs obligatoires manquants." }, { status: 400 });
    }

    const { data: ride, error } = await supabase
      .from("rides")
      .insert({
        title,
        description: description || "",
        ride_date,
        ride_time,
        place,
        place_url: place_url || null,
        distance_km: Number(distance_km) || 0,
        elevation_gain_m: Math.round(Number(elevation_gain_m) || 0),
        strava_url: strava_url || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const rows = (groups as string[]).map((g) => ({
      ride_id: ride.id,
      group_level: g,
      target_speed: GROUP_SPEED[g] || "",
    }));
    const { error: gErr } = await supabase.from("ride_groups").insert(rows);
    if (gErr) return NextResponse.json({ error: gErr.message }, { status: 400 });

    // La nouvelle sortie doit apparaitre immediatement sur l'Accueil
    // (Sorties a fusionne avec l'Accueil, voir components/BottomNav.tsx),
    // sans attendre une revalidation ISR (voir la meme logique sur les
    // routes /api/participations).
    revalidatePath("/home");

    return NextResponse.json({ ride });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue." }, { status: 500 });
  }
}
