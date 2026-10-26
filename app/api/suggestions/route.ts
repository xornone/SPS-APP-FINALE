import { NextRequest, NextResponse } from "next/server";
import { sendSuggestionEmail } from "@/lib/mailer";

// Route d'envoi des messages de la boîte à idées.
// Accepte un FormData avec message, category, authorName, isAnonymous, email, et photos.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const message = (formData.get("message") as string | null)?.trim();
    const category = (formData.get("category") as string | null)?.trim() || "💡 Idée / Suggestion";
    const authorName = (formData.get("authorName") as string | null)?.trim() || undefined;
    const isAnonymous = formData.get("isAnonymous") === "true";
    const email = (formData.get("email") as string | null)?.trim() || undefined;

    if (!message) {
      return NextResponse.json({ error: "Le message ne peut pas être vide." }, { status: 400 });
    }

    if (!isAnonymous && !authorName) {
      return NextResponse.json(
        { error: "Veuillez renseigner votre nom ou cocher l'option 'Rester anonyme'." },
        { status: 400 }
      );
    }

    // Récupération des pièces jointes / photos
    const files = formData.getAll("attachments") as File[];
    const attachments: { filename: string; content: Buffer; contentType?: string }[] = [];

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo par photo
    const MAX_FILES = 5;

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Vous ne pouvez pas envoyer plus de ${MAX_FILES} photos à la fois.` },
        { status: 400 }
      );
    }

    for (const file of files) {
      // Certains navigateurs envoient un File vide si aucun fichier n'a été choisi
      if (!file || file.size === 0 || !file.name) continue;

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `La photo "${file.name}" dépasse la taille maximale autorisée (10 Mo).` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      attachments.push({
        filename: file.name,
        content: buffer,
        contentType: file.type || undefined,
      });
    }

    const result = await sendSuggestionEmail({
      category,
      message,
      authorName,
      isAnonymous,
      email,
      attachments,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Impossible d'envoyer l'e-mail. Veuillez réessayer ultérieurement." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      simulated: result.simulated ?? false,
      message: "Message envoyé avec succès !",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Erreur dans /api/suggestions :", errorMsg);
    return NextResponse.json({ error: "Une erreur inattendue est survenue." }, { status: 500 });
  }
}
