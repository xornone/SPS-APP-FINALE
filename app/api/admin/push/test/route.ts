import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { sendPushToAdmins } from "@/lib/webpush";

export const dynamic = "force-dynamic";

// Permet aux administrateurs de tester directement la reception d'une notification
// push administrateur sur leurs appareils enregistres.
export async function POST() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const result = await sendPushToAdmins({
      title: "💡 Test de notification admin SPS",
      body: "Bravo ! Les notifications pour la boîte à idées fonctionnent correctement sur tes appareils.",
      url: "/boite-a-idees",
    });

    if (result.error) {
      return NextResponse.json(
        {
          ok: false,
          error: `Erreur push : ${result.error}. (Vérifie si la colonne is_admin existe bien dans Supabase).`,
        },
        { status: 500 }
      );
    }

    if (result.count === 0) {
      return NextResponse.json({
        ok: false,
        warning:
          "Aucun appareil administrateur n'est encore enregistré avec les notifications activées. Clique sur 'Activer les alertes sur cet appareil' pour recevoir les notifications.",
        count: 0,
      });
    }

    return NextResponse.json({
      ok: true,
      message: `Notification de test envoyée avec succès à ${result.count} appareil(s) administrateur !`,
      count: result.count,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Erreur serveur inattendue." }, { status: 500 });
  }
}
