import { createClient } from "./supabase/server";

/**
 * Verifie que l'utilisateur de la requete courante est authentifie.
 * L'app n'a qu'un seul type de compte (cree par invitation Supabase,
 * inscription publique desactivee) : toute session valide EST admin.
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
