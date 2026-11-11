import { cookies } from "next/headers";
import { createClient } from "./supabase/server";

/**
 * Verifie rapidement si l'utilisateur courant est admin côté serveur (SSR).
 * Retourne false immédiatement si aucun cookie de session Supabase n'est présent,
 * évitant tout appel réseau inutile pour les visiteurs non connectés.
 */
export async function checkIsAdminServer(): Promise<boolean> {
  try {
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    const hasAuthCookie = allCookies.some(
      (c) => c.name.startsWith("sb-") && c.name.includes("-auth-token")
    );
    if (!hasAuthCookie) return false;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}

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
