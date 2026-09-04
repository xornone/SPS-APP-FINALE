import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Poste un message sous une sortie — aucun compte requis, comme pour les
// participations. Le serveur genere un client_token qu'il renvoie une
// seule fois (le navigateur le garde en localStorage pour pouvoir
// supprimer ce message plus tard). La table ride_comments n'a aucune
// policy RLS pour anon/authenticated : toutes les ecritures passent par
// ici, avec la cle service role.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rideId = String(body.ride_id || "");
    const name = String(body.author_name || "").trim();
    const message = String(body.message || "").trim();

    if (!rideId || !name || !message) {
      return NextResponse.json({ error: "Nom, sortie et message requis." }, { status: 400 });
    }
    if (name.length > 60) {
      return NextResponse.json({ error: "Nom trop long." }, { status: 400 });
    }
    if (message.length > 500) {
      return NextResponse.json({ error: "Message trop long (500 caractères maximum)." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: ride, error: rideError } = await admin
      .from("rides")
      .select("id")
      .eq("id", rideId)
      .maybeSingle();
    // On distingue une vraie erreur (cle service role invalide, etc.) d'une
    // sortie simplement absente, pour ne pas afficher "Sortie introuvable"
    // en cas de probleme de configuration serveur.
    if (rideError) {
      return NextResponse.json({ error: `Erreur serveur : ${rideError.message}` }, { status: 500 });
    }
    if (!ride) {
      return NextResponse.json({ error: "Sortie introuvable." }, { status: 404 });
    }

    const { data, error } = await admin
      .from("ride_comments")
      .insert({ ride_id: rideId, author_name: name, message })
      .select("id, client_token")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ id: data.id, client_token: data.client_token });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue." }, { status: 500 });
  }
}
