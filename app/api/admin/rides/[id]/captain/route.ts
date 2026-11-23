import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminGuard";
import { extractCaptainFromDescription, updateCaptainInDescription } from "@/lib/captain";
import { logActivity } from "@/lib/activityLogger";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const { supabase } = guard;

    const body = await request.json().catch(() => ({}));
    const captainName = typeof body.captainName === "string" ? body.captainName.trim() : "";

    // 1. Lire la description et le titre actuels de la sortie
    const { data: ride, error: fetchErr } = await supabase
      .from("rides")
      .select("id, title, description")
      .eq("id", params.id)
      .single();

    if (fetchErr || !ride) {
      return NextResponse.json({ error: "Sortie introuvable." }, { status: 404 });
    }

    const previousCaptain = extractCaptainFromDescription(ride.description || "");

    // 2. Mettre à jour la description avec la balise capitaine 🧭
    const updatedDesc = updateCaptainInDescription(ride.description || "", captainName);

    const { error: updateErr } = await supabase
      .from("rides")
      .update({ description: updatedDesc })
      .eq("id", params.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    // 3. Tracer l'action dans le journal d'activité SPS
    await logActivity({
      actorType: "admin",
      actorName:
        guard.user.user_metadata?.full_name ||
        guard.user.user_metadata?.name ||
        guard.user.email ||
        "Admin",
      actorEmail: guard.user.email,
      actorId: guard.user.id,
      action: captainName ? "admin_set_captain" : "admin_remove_captain",
      targetType: "ride",
      targetId: params.id,
      targetTitle: ride.title,
      details: {
        captain_name: captainName || null,
        previous_captain: previousCaptain || null,
      },
      request,
    });

    // 4. Revalider les caches Next.js
    revalidatePath(`/rides/${params.id}`);
    revalidatePath("/rides");
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
