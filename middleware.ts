import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Seul /admin exige une session : le reste de l'app (accueil, sorties,
// carte) est public — les membres n'ont pas de compte, ils s'inscrivent
// aux sorties avec juste leur nom.
const PROTECTED_PREFIX = "/admin";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith(PROTECTED_PREFIX);
  const isLogin = path === "/login";

  // Seules /admin/* et /login ont besoin de connaitre la session : partout
  // ailleurs (accueil, sorties, fiche sortie, statistiques, API publiques
  // comme /api/comments ou /api/participations...) on evite l'appel reseau
  // vers Supabase Auth sur CHAQUE navigation/requete, qui etait jusqu'ici
  // fait systematiquement meme pour un visiteur anonyme sans session. Les
  // routes /api/admin/* ne sont pas concernees par ce matcher (elles ne
  // commencent pas par "/admin") : elles verifient deja elles-memes la
  // session via requireAdmin(), independamment du middleware.
  if (!isProtected && !isLogin) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
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
