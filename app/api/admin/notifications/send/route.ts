import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { sendPushToAll } from "@/lib/webpush";

// Envoi manuel d'une notification push a tous les abonnes, depuis l'onglet
// Admin (AdminNotificationComposer). Protege comme les autres routes
// /api/admin/*.
export async function POST(request: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const body = await request.json().catch(() => ({}));
    const title = String(body?.title || "").trim();
    const message = String(body?.body || "").trim();

    if (!message) {
      return NextResponse.json({ error: "Le message est obligatoire." }, { status: 400 });
    }

    await sendPushToAll({ title: title || "SPS", body: message, url: "/home" });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue." }, { status: 500 });
  }
}
