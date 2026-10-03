import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Retire un abonnement push (bouton "Desactiver" dans NotificationOptIn).
// Aucun compte requis : identifie uniquement par l'endpoint du navigateur,
// meme logique que la route subscribe.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const endpoint = String(body?.endpoint || "");
    if (!endpoint) return NextResponse.json({ error: "Endpoint manquant." }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue." }, { status: 500 });
  }
}
