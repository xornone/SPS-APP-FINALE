import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { exchangeStravaCode, isStravaTestAdmin, saveStravaConnection } from "@/lib/stravaTest";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://spsapp2.vercel.app";
}

// Callback OAuth Strava : navigation complete du navigateur (redirection
// depuis strava.com), donc les cookies de session admin sont bien envoyes
// si l'admin est toujours connecte a l'app. requireAdmin() ici empeche
// qu'un lien de callback force (sans passer par /connect) puisse enregistrer
// un jeton pour un des deux admins de test sans etre soi-meme un admin de
// l'app.
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.redirect(`${siteUrl()}/login?next=/admin2test`);
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") || "";
  const errorParam = searchParams.get("error");

  if (errorParam || !code || !isStravaTestAdmin(state)) {
    return NextResponse.redirect(`${siteUrl()}/admin2test?strava_error=1`);
  }

  try {
    const token = await exchangeStravaCode(code);
    await saveStravaConnection(state, token);
    return NextResponse.redirect(`${siteUrl()}/admin2test?strava_connected=${encodeURIComponent(state)}`);
  } catch {
    return NextResponse.redirect(`${siteUrl()}/admin2test?strava_error=1`);
  }
}
