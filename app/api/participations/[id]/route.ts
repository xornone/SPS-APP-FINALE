import { NextResponse } from "next/server";
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
  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();

  const { data: row } = await admin.from("participations").select("id, client_token").eq("id", params.id).maybeSingle();
  if (!row) return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });

  const ownToken = typeof body.client_token === "string" && body.client_token === row.client_token;
  if (!ownToken && !(await isAdminSession())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const { error } = await admin.from("participations").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// Changer de groupe sur sa propre inscription (jeton requis — reservee a
// la personne elle-meme, l'admin n'a pas besoin de cette action).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const group = String(body.group_level || "");
  if (!GROUPS.includes(group)) {
    return NextResponse.json({ error: "Groupe invalide." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin.from("participations").select("id, client_token").eq("id", params.id).maybeSingle();
  if (!row) return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });

  if (typeof body.client_token !== "string" || body.client_token !== row.client_token) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const { error } = await admin.from("participations").update({ group_level: group }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
