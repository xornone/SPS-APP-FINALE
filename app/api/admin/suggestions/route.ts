import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { getAllSuggestions } from "@/lib/suggestionsStorage";

export const dynamic = "force-dynamic";

// Lecture de toutes les suggestions pour les administrateurs
export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const suggestions = await getAllSuggestions();
    return NextResponse.json({ suggestions });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Erreur dans GET /api/admin/suggestions :", errorMsg);
    return NextResponse.json({ error: "Impossible de récupérer les suggestions." }, { status: 500 });
  }
}
