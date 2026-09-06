import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminGuard";

const GROUP_SPEED: Record<string, string> = {
  vert: "24–26 km/h",
  rouge: "26–28 km/h",
  violet: "28+ km/h",
};

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { supabase } = guard;

    const body = await request.json();
    const { title, description, ride_date, ride_time, place, place_url, distance_km, elevation_gain_m, strava_url, groups } = body;

    const { error } = await supabase
      .from("rides")
      .update({
        title,
        description: description || "",
        ride_date,
        ride_time,
        place,
        place_url: place_url || null,
        distance_km: Number(distance_km) || 0,
        elevation_gain_m: Math.round(Number(elevation_gain_m) || 0),
        strava_url: strava_url || null,
      })
      .eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    if (Array.isArray(groups)) {
      await supabase.from("ride_groups").delete().eq("ride_id", params.id);
      const rows = groups.map((g: string) => ({
        ride_id: params.id,
        group_level: g,
        target_speed: GROUP_SPEED[g] || "",
      }));
      const { error: gErr } = await supabase.from("ride_groups").insert(rows);
      if (gErr) return NextResponse.json({ error: gErr.message }, { status: 400 });
    }

    // La sortie modifiee (dates, groupes de niveau...) doit se refleter
    // immediatement sur l'Accueil et sa propre fiche — y compris l'alerte
    // "pas d'admin en {groupe}" quand un groupe vient d'etre ajoute (voir
    // lib/admins.ts).
    revalidatePath("/home");
    revalidatePath(`/rides/${params.id}`);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { supabase } = guard;

    const { error } = await supabase.from("rides").delete().eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    revalidatePath("/home");

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue." }, { status: 500 });
  }
}
