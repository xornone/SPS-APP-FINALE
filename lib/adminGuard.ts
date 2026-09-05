import { createClient } from "./supabase/server";

/**
 * Verifie que l'utilisateur de la requete courante est authentifie.
 * L'app n'a qu'un seul type de compte (email + mot de passe cree
 * directement dans le tableau de bord Supabase par le club, inscription
 * publique desactivee) : toute session valide EST admin.
 * A appeler en tete de chaque route /api/admin/*.
 */
export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "Non authentifié." };

  return { ok: true as const, supabase, user };
}
