import { NextRequest, NextResponse } from "next/server";
import { addSuggestion } from "@/lib/suggestionsStorage";
import { sendPushToAdmins } from "@/lib/webpush";
import { logActivity } from "@/lib/activityLogger";
import { createAdminClient } from "@/lib/supabase/admin";

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
        clientToken: formData.get("clientToken") as string,
        deviceAuthor: formData.get("deviceAuthor") as string,
      };
    }

    const message = body.message?.trim();
    const category = body.category?.trim() || "💡 Idée / Suggestion";
    const authorName = body.authorName?.trim() || undefined;
    const isAnonymous = Boolean(body.isAnonymous);
    const email = body.email?.trim() || undefined;
    const clientToken =
      (body.clientToken as string | undefined)?.trim() ||
      request.headers.get("x-client-token")?.trim() ||
      undefined;
    const deviceAuthor = (body.deviceAuthor as string | undefined)?.trim() || undefined;

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

    // Résolution d'identité discrète pour le journal d'activité
    let resolvedIdentity: string | null = null;
    if (isAnonymous) {
      if (deviceAuthor) {
        resolvedIdentity = deviceAuthor;
      } else if (clientToken) {
        try {
          const admin = createAdminClient();
          const { data: vote } = await admin
            .from("poll_votes")
            .select("voter_name")
            .eq("voter_token", clientToken)
            .not("voter_name", "is", null)
            .limit(1)
            .maybeSingle();

          if (vote?.voter_name) {
            resolvedIdentity = vote.voter_name;
          } else {
            const { data: pastAct } = await admin
              .from("activity_logs")
              .select("actor_name")
              .eq("client_token", clientToken)
              .not("actor_name", "ilike", "%anonyme%")
              .limit(1)
              .maybeSingle();
            if (pastAct?.actor_name) {
              resolvedIdentity = pastAct.actor_name;
            }
          }
        } catch (e) {
          console.warn("[suggestions] Erreur résolution identité anonyme:", e);
        }
      }
    }

    // Journal d'activité SPS
    await logActivity({
      actorType: "member",
      actorName: isAnonymous
        ? (resolvedIdentity ? `Membre anonyme [${resolvedIdentity}]` : "Membre anonyme")
        : (authorName || "Membre"),
      actorEmail: email || null,
      clientToken: clientToken || null,
      action: "suggestion_add",
      targetType: "suggestion",
      targetId: suggestion.id,
      targetTitle: category,
      details: {
        category,
        message_preview: message.slice(0, 120),
        is_anonymous: isAnonymous,
        real_identity: resolvedIdentity || (isAnonymous ? "Non identifié" : authorName),
        client_token: clientToken || null,
        device_author: deviceAuthor || null,
      },
      request,
    });

    // Envoi de la notification push aux seuls appareils des administrateurs
    try {
      const author = isAnonymous ? "Un membre (anonyme)" : (suggestion.author_name || "Un membre");
      const preview =
        suggestion.message.length > 70
          ? `${suggestion.message.slice(0, 67)}...`
          : suggestion.message;

      const pushRes = await sendPushToAdmins({
        title: "💡 Nouvelle idée boîte à idées",
        body: `${author} : « ${preview} »`,
        url: "/boite-a-idees",
      });
      console.log("[suggestions] Notification push admin déclenchée :", pushRes);
    } catch (pushErr) {
      console.error("[suggestions] Échec déclenchement push admin :", pushErr);
    }

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
