import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Enregistre un abonnement push navigateur — aucun compte requis, meme
// modele que app/api/participations/route.ts : la table n'a aucune policy
// RLS pour anon/authenticated, toute ecriture passe par ici avec la cle
// service role.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const endpoint = String(body?.endpoint || "");
    const p256dh = String(body?.keys?.p256dh || "");
    const auth = String(body?.keys?.auth || "");

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Abonnement push invalide." }, { status: 400 });
    }

    const admin = createAdminClient();
    // upsert sur endpoint : un meme navigateur qui se reabonne (ex: apres
    // un vidage de cache) met simplement a jour ses cles plutot que de
    // creer un doublon.
    const { error } = await admin.from("push_subscriptions").upsert({ endpoint, p256dh, auth }, { onConflict: "endpoint" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue." }, { status: 500 });
  }
}
