import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { exchangeStravaCode, saveStravaConnection } from "@/lib/strava";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://spsapp2.vercel.app";
}

// Callback OAuth Strava : navigation complete du navigateur (redirection
// depuis strava.com), donc les cookies de session admin sont bien envoyes
// si l'admin est toujours connecte a l'app. requireAdmin() ici sert aussi
// a savoir POUR QUI enregistrer la connexion (guard.user.id) : chaque
// admin ne peut donc jamais enregistrer un jeton que sous son propre
// identifiant.
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.redirect(`${siteUrl()}/login?next=/admin`);
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");

  if (errorParam || !code) {
    return NextResponse.redirect(
      `${siteUrl()}/admin?strava_error=${encodeURIComponent(errorParam || "Code d'autorisation manquant.")}`
    );
  }

  try {
    const token = await exchangeStravaCode(code);
    const name = await saveStravaConnection(guard.user.id, token);
    return NextResponse.redirect(`${siteUrl()}/admin?strava_connected=${encodeURIComponent(name)}`);
  } catch (err: any) {
    // Le detail (message Strava ou erreur Supabase) est affiche directement
    // sur /admin (StravaConnectPanel) : bien plus utile pour diagnostiquer
    // qu'un message generique, sans avoir besoin des logs Vercel.
    const message = (err?.message || "Erreur inconnue.").slice(0, 300);
    return NextResponse.redirect(`${siteUrl()}/admin?strava_error=${encodeURIComponent(message)}`);
  }
}
