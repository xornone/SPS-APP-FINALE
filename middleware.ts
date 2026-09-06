import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Seul /admin exige une session pour AFFICHER la page : le reste de l'app
// (accueil, sorties, carte) est public — les membres n'ont pas de compte,
// ils s'inscrivent aux sorties avec juste leur nom.
const PROTECTED_PREFIX = "/admin";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith(PROTECTED_PREFIX);
  const isLogin = path === "/login";
  // Une route API (retrait d'un participant ou d'un commentaire, gestion
  // des sorties depuis /api/admin/*...) peut verifier elle-meme une session
  // admin. Sans rafraichissement ici, le jeton finit par expirer des qu'un
  // admin passe un moment sans visiter /admin — la verification echoue
  // alors de facon intermittente ("parfois je ne peux pas supprimer un
  // participant"), meme pour un admin bel et bien connecte.
  const isApi = path.startsWith("/api/");

  // Partout ailleurs (accueil, sorties, fiche sortie, statistiques) on
  // evite l'appel reseau vers Supabase Auth sur CHAQUE navigation, qui
  // etait jusqu'ici fait systematiquement meme pour un visiteur anonyme
  // sans session.
  if (!isProtected && !isLogin && !isApi) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  // getAll/setAll (plutot que l'ancienne API get/set/remove) : le
  // rafraichissement d'une session ecrit parfois plusieurs cookies en un
  // seul passage (jeton d'acces + jeton de rafraichissement, ou un jeton de
  // session decoupe en plusieurs morceaux) — l'ancienne API, qui recreait
  // une reponse a chaque cookie pose un a un, perdait les cookies deja
  // ecrits juste avant dans le meme appel, ce qui pouvait corrompre la
  // session et causer des echecs d'authentification intermittents.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
