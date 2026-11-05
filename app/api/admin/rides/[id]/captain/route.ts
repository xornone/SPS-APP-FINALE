import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminGuard";
import { extractCaptainFromDescription, updateCaptainInDescription } from "@/lib/captain";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { supabase } = guard;

    const body = await request.json().catch(() => ({}));
    const captainName = typeof body.captainName === "string" ? body.captainName.trim() : "";

    // 1. Lire la description actuelle de la sortie
    const { data: ride, error: fetchErr } = await supabase
      .from("rides")
      .select("id, description")
      .eq("id", params.id)
      .single();

    if (fetchErr || !ride) {
      return NextResponse.json({ error: "Sortie introuvable." }, { status: 404 });
    }

    // 2. Mettre à jour la description avec la balise capitaine 🧭
    const updatedDesc = updateCaptainInDescription(ride.description || "", captainName);

    const { error: updateErr } = await supabase
      .from("rides")
      .update({ description: updatedDesc })
      .eq("id", params.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    // 3. Revalider les caches Next.js
    revalidatePath(`/rides/${params.id}`);
    revalidatePath(`/v2/rides/${params.id}`);
    revalidatePath("/rides");
    revalidatePath("/v2/rides");
    revalidatePath("/");

    return NextResponse.json({
      ok: true,
      captain: extractCaptainFromDescription(updatedDesc),
      description: updatedDesc,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
}
