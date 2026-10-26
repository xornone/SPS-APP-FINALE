import { NextRequest, NextResponse } from "next/server";
import { addSuggestion } from "@/lib/suggestionsStorage";

// Route publique de soumission d'une idée (sans e-mail, sans pièce jointe)
export async function POST(request: NextRequest) {
  try {
    let body;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = {
        message: formData.get("message") as string,
        category: formData.get("category") as string,
        authorName: formData.get("authorName") as string,
        isAnonymous: formData.get("isAnonymous") === "true",
        email: formData.get("email") as string,
      };
    }

    const message = body.message?.trim();
    const category = body.category?.trim() || "💡 Idée / Suggestion";
    const authorName = body.authorName?.trim() || undefined;
    const isAnonymous = Boolean(body.isAnonymous);
    const email = body.email?.trim() || undefined;

    if (!message) {
      return NextResponse.json({ error: "Le message ne peut pas être vide." }, { status: 400 });
    }

    if (!isAnonymous && !authorName) {
      return NextResponse.json(
        { error: "Veuillez renseigner votre nom ou cocher l'option 'Rester anonyme'." },
        { status: 400 }
      );
    }

    const suggestion = await addSuggestion({
      category,
      message,
      authorName,
      isAnonymous,
      email,
    });

    return NextResponse.json({
      success: true,
      suggestion,
      message: "Idée enregistrée avec succès !",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Erreur dans POST /api/suggestions :", errorMsg);
    return NextResponse.json({ error: "Une erreur inattendue est survenue." }, { status: 500 });
  }
}
