import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client "service role" — SERVEUR UNIQUEMENT (routes /api/admin/*).
 * Bypass RLS : ne jamais importer ce fichier depuis un composant client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquante — requise pour les operations d'administration."
    );
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
