import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const GROUPS = ["vert", "rouge", "violet"];

async function isAdminSession(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}

// Retire une inscription : soit la personne elle-meme (client_token dans le
// corps de la requete, retrouve depuis son localStorage), soit
// l'administrateur depuis l'espace admin (session authentifiee, pas de
// jeton necessaire).
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const admin = createAdminClient();

    const { data: row, error: rowError } = await admin
      .from("participations")
      .select("id, ride_id, client_token")
      .eq("id", params.id)
      .maybeSingle();
    if (rowError) return NextResponse.json({ error: `Erreur serveur : ${rowError.message}` }, { status: 500 });
    if (!row) return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });

    const ownToken = typeof body.client_token === "string" && body.client_token === row.client_token;
    if (!ownToken && !(await isAdminSession())) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
    }

    const { error } = await admin.from("participations").delete().eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Meme logique que sur l'inscription : purge immediate du cache
    // d'Accueil/Sorties/fiche sortie pour que le retrait s'y reflete tout
    // de suite (voir POST /api/participations).
    revalidatePath("/home");
    revalidatePath("/rides");
    revalidatePath(`/rides/${row.ride_id}`);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue." }, { status: 500 });
  }
}

// Changer de groupe sur sa propre inscription (jeton requis — reservee a
// la personne elle-meme, l'admin n'a pas besoin de cette action).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const group = String(body.group_level || "");
    if (!GROUPS.includes(group)) {
      return NextResponse.json({ error: "Groupe invalide." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: row, error: rowError } = await admin
      .from("participations")
      .select("id, ride_id, client_token")
      .eq("id", params.id)
      .maybeSingle();
    if (rowError) return NextResponse.json({ error: `Erreur serveur : ${rowError.message}` }, { status: 500 });
    if (!row) return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });

    if (typeof body.client_token !== "string" || body.client_token !== row.client_token) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
    }

    const { error } = await admin.from("participations").update({ group_level: group }).eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Le groupe n'affecte pas le nombre de participants (Accueil/Sorties),
    // mais la repartition par groupe affichee sur la fiche sortie, elle,
    // change : meme purge que sur l'inscription/le retrait.
    revalidatePath(`/rides/${row.ride_id}`);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue." }, { status: 500 });
  }
}
