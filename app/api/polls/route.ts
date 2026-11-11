import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { getAllPolls } from "@/lib/pollsStorage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const voterToken = searchParams.get("voter_token") || undefined;
    const voterName = searchParams.get("voter_name") || undefined;

    // Vérifier si l'utilisateur appelant est admin connecté
    let isAdmin = false;
    try {
      const guard = await requireAdmin();
      isAdmin = guard.ok;
    } catch {
      isAdmin = false;
    }

    const polls = await getAllPolls(isAdmin, voterToken, voterName);

    return NextResponse.json({
      ok: true,
      polls,
      isAdmin,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/polls] Erreur :", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
