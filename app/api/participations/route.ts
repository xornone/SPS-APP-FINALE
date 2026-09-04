import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const GROUPS = ["vert", "rouge", "violet"];

// Inscription a une sortie — aucun compte requis. Le nom est fourni par la
// personne elle-meme ; le serveur genere un client_token qu'il renvoie une
// seule fois (le navigateur le garde en localStorage pour pouvoir modifier
// ou retirer cette inscription plus tard). La table participations n'a
// aucune policy RLS pour anon/authenticated : toutes les ecritures passent
// par ici, avec la cle service role.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const rideId = String(body.ride_id || "");
  const name = String(body.participant_name || "").trim();
  const group = String(body.group_level || "");

  if (!rideId || !name) {
    return NextResponse.json({ error: "Nom et sortie requis." }, { status: 400 });
  }
  if (name.length > 60) {
    return NextResponse.json({ error: "Nom trop long." }, { status: 400 });
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
  if (rideError || !ride) {
    return NextResponse.json({ error: "Sortie introuvable." }, { status: 404 });
  }
  const availableGroups = (ride.ride_groups as { group_level: string }[]).map((g) => g.group_level);
  if (!availableGroups.includes(group)) {
    return NextResponse.json({ error: "Ce groupe n'est pas proposé sur cette sortie." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("participations")
    .insert({ ride_id: rideId, participant_name: name, group_level: group })
    .select("id, client_token")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ id: data.id, client_token: data.client_token });
}
