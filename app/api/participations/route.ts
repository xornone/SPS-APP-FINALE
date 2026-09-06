import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

const GROUPS = ["vert", "rouge", "violet"];

// Inscription a une sortie — aucun compte requis. Le nom est fourni par la
// personne elle-meme ; le serveur genere un client_token qu'il renvoie une
// seule fois (le navigateur le garde en localStorage pour pouvoir modifier
// ou retirer cette inscription plus tard). La table participations n'a
// aucune policy RLS pour anon/authenticated : toutes les ecritures passent
// par ici, avec la cle service role.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rideId = String(body.ride_id || "");
    const name = String(body.participant_name || "").trim().replace(/\s+/g, " ");
    const group = String(body.group_level || "");

    if (!rideId || !name) {
      return NextResponse.json({ error: "Nom et sortie requis." }, { status: 400 });
    }
    if (name.length > 60) {
      return NextResponse.json({ error: "Nom trop long." }, { status: 400 });
    }
    // Prenom + nom obligatoires (pas juste un prenom) pour eviter de
    // confondre deux personnes qui partagent le meme prenom. Revalide cote
    // serveur ce que JoinPanel verifie deja cote client.
    if (name.split(" ").length < 2) {
      return NextResponse.json({ error: "Merci d'indiquer ton prénom ET ton nom." }, { status: 400 });
    }
    if (!GROUPS.includes(group)) {
      return NextResponse.json({ error: "Groupe invalide." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: ride, error: rideError } = await admin
      .from("rides")
      .select("id, ride_date, ride_groups(group_level)")
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
    const availableGroups = (ride.ride_groups as { group_level: string }[]).map((g) => g.group_level);
    if (!availableGroups.includes(group)) {
      return NextResponse.json({ error: "Ce groupe n'est pas proposé sur cette sortie." }, { status: 400 });
    }

    // Une seule inscription par personne (nom identique, insensible a la
    // casse et aux espaces) sur une meme sortie. Verifie ici pour un message
    // clair, et protege en base par un index unique (voir migration 0005)
    // en filet de securite contre une double soumission simultanee.
    const { data: existing, error: existingError } = await admin
      .from("participations")
      .select("id, participant_name")
      .eq("ride_id", rideId);
    if (existingError) {
      return NextResponse.json({ error: `Erreur serveur : ${existingError.message}` }, { status: 500 });
    }
    const normalizedName = name.toLowerCase();
    if ((existing || []).some((p) => p.participant_name.trim().toLowerCase() === normalizedName)) {
      return NextResponse.json(
        { error: "Tu es déjà inscrit(e) sous ce nom à cette sortie." },
        { status: 409 }
      );
    }

    const { data, error } = await admin
      .from("participations")
      .insert({ ride_id: rideId, participant_name: name, group_level: group })
      .select("id, client_token")
      .single();
    if (error) {
      // Filet de securite si deux inscriptions identiques sont envoyees en
      // meme temps (23505 = violation de l'index unique, voir migration 0005).
      if ((error as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: "Tu es déjà inscrit(e) sous ce nom à cette sortie." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Accueil, Sorties et la fiche sortie sont mis en cache (export const
    // revalidate) pour naviguer plus vite : on purge ce cache tout de suite
    // pour que la nouvelle inscription y apparaisse immediatement, sans
    // attendre la fenetre de revalidation (15-20s).
    revalidatePath("/home");
    revalidatePath("/rides");
    revalidatePath(`/rides/${rideId}`);

    return NextResponse.json({ id: data.id, client_token: data.client_token });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue." }, { status: 500 });
  }
}
