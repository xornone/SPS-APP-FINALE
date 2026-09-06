import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminGuard";
import { parseGpx } from "@/lib/gpx";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { supabase } = guard;

    const form = await request.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });

    const text = await file.text();
    const parsed = parseGpx(text);
    if (!parsed) {
      return NextResponse.json({ error: "Fichier GPX invalide ou illisible." }, { status: 400 });
    }

    const path = `${params.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("gpx").upload(path, text, {
      contentType: "application/gpx+xml",
      upsert: true,
    });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });

    const { error: updateError } = await supabase
      .from("rides")
      .update({
        gpx_path: path,
        route_points: parsed.points,
        route_elevations: parsed.elevations,
      })
      .eq("id", params.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

    revalidatePath("/home");
    revalidatePath(`/rides/${params.id}`);

    return NextResponse.json({
      ok: true,
      distanceKm: Math.round(parsed.distanceKm * 10) / 10,
      elevationGainM: Math.round(parsed.elevationGainM),
      hasRealElevation: parsed.hasRealElevation,
      points: parsed.points,
    });
  } catch (err: any) {
    // Filet de securite : garantit une reponse JSON meme sur une exception
    // non prevue, plutot qu'un 500 a corps vide (qui casse res.json() cote
    // client avec "Unexpected end of JSON input").
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue." }, { status: 500 });
  }
}
