import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function isAdminSession(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}

// Supprime un message : soit son auteur (client_token dans le corps de la
// requete, retrouve depuis son localStorage), soit l'administrateur
// (session authentifiee, pas de jeton necessaire — moderation).
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const admin = createAdminClient();

    const { data: row, error: rowError } = await admin
      .from("ride_comments")
      .select("id, client_token")
      .eq("id", params.id)
      .maybeSingle();
    if (rowError) return NextResponse.json({ error: `Erreur serveur : ${rowError.message}` }, { status: 500 });
    if (!row) return NextResponse.json({ error: "Message introuvable." }, { status: 404 });

    const ownToken = typeof body.client_token === "string" && body.client_token === row.client_token;
    if (!ownToken && !(await isAdminSession())) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
    }

    const { error } = await admin.from("ride_comments").delete().eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue." }, { status: 500 });
  }
}
