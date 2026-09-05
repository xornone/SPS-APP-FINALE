import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase "public" : pas de cookies, pas de session — juste la cle
 * anonyme. A utiliser pour les pages 100% publiques qui n'ont besoin
 * d'aucune donnee liee a une session (accueil, liste des sorties,
 * statistiques du club...).
 *
 * Pourquoi un client a part : le client de lib/supabase/server.ts appelle
 * cookies() (Next.js), ce qui force la page entiere en rendu dynamique
 * (recalculee integralement a chaque visite, sans mise en cache possible)
 * meme quand la page n'utilise jamais la session. Ce client-ci n'appelle
 * jamais cookies(), donc les pages qui l'utilisent restent eligibles au
 * cache/ISR de Next.js (voir `export const revalidate` dans ces pages) —
 * nettement plus rapide a la navigation, en particulier sur Vercel ou une
 * page non mise en cache peut repartir d'une fonction serverless "froide"
 * a chaque visite.
 *
 * Les lectures faites via ce client restent soumises aux memes policies
 * RLS "readable by anyone" que le client cookies — aucune donnee de plus
 * n'est exposee.
 */
export function createPublicClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}
