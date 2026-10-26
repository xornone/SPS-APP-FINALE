import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { removeSuggestion, toggleSuggestionStatus } from "@/lib/suggestionsStorage";

export const dynamic = "force-dynamic";

// Modification du statut d'une suggestion (ex: traité / nouveau)
export async function PATCH(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const updated = await toggleSuggestionStatus(params.id);
    if (!updated) {
      return NextResponse.json({ error: "Suggestion introuvable." }, { status: 404 });
    }

    return NextResponse.json({ success: true, suggestion: updated });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Erreur dans PATCH /api/admin/suggestions/[id] :", errorMsg);
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}

// Suppression d'une suggestion
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const removed = await removeSuggestion(params.id);
    if (!removed) {
      return NextResponse.json({ error: "Suggestion introuvable." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Erreur dans DELETE /api/admin/suggestions/[id] :", errorMsg);
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}
