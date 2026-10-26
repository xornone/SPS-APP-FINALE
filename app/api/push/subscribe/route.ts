import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Enregistre un abonnement push navigateur — aucun compte requis pour les membres,
// mais si un administrateur authentifie enregistre ou synchronise son appareil,
// son abonnement est marque is_admin: true pour lui adresser les alertes admin.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const endpoint = String(body?.endpoint || "");
    const p256dh = String(body?.keys?.p256dh || "");
    const auth = String(body?.keys?.auth || "");

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Abonnement push invalide." }, { status: 400 });
    }

    // Verifier si l'utilisateur envoyant la requete possede une session admin valide
    let isAdmin = false;
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      isAdmin = !!user;
    } catch {
      // Ignorer si contexte non authentifie
    }

    const admin = createAdminClient();

    // Verifier si cet endpoint etait deja marque admin dans la base
    let alreadyAdmin = false;
    try {
      const { data: existing } = await admin
        .from("push_subscriptions")
        .select("is_admin")
        .eq("endpoint", endpoint)
        .maybeSingle();
      alreadyAdmin = Boolean(existing?.is_admin);
    } catch {
      // Si la colonne n'existe pas encore
    }

    const shouldBeAdmin = isAdmin || alreadyAdmin;

    // Tentative d'upsert avec is_admin
    let upsertRes = await admin
      .from("push_subscriptions")
      .upsert(
        { endpoint, p256dh, auth, is_admin: shouldBeAdmin },
        { onConflict: "endpoint" }
      );

    // Si la colonne is_admin n'a pas encore ete appliquee dans Supabase, repli gracieux
    if (upsertRes.error && upsertRes.error.message?.includes("is_admin")) {
      upsertRes = await admin
        .from("push_subscriptions")
        .upsert({ endpoint, p256dh, auth }, { onConflict: "endpoint" });
    }

    if (upsertRes.error) {
      return NextResponse.json({ error: upsertRes.error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, is_admin: shouldBeAdmin });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue." }, { status: 500 });
  }
}
