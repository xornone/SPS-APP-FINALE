import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { disconnectStrava } from "@/lib/strava";

export async function POST() {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    // Toujours la propre connexion de l'admin appelant — jamais un autre
    // identifiant recu du client, pour ne jamais pouvoir deconnecter le
    // compte Strava de quelqu'un d'autre.
    await disconnectStrava(guard.user.id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue." }, { status: 500 });
  }
}
