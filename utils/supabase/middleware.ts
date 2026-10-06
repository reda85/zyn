import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getCookieDomain, isAuthCookieName } from "@/utils/supabase/cookie-domain";

/** Noms de cookies de session présents plusieurs fois dans l'en-tête brut. */
function duplicatedAuthCookies(request: NextRequest): string[] {
  const seen = new Map<string, number>();
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const name = part.split("=")[0]?.trim();
    if (name && isAuthCookieName(name)) seen.set(name, (seen.get(name) || 0) + 1);
  }
  return Array.from(seen).filter(([, count]) => count > 1).map(([name]) => name);
}

export const updateSession = async (request: NextRequest) => {
  const cookieOptions = getCookieDomain(request.headers.get("host") || "");

  try {
    // ── Nettoyage des doublons hérités ────────────────────────────────────────
    // D'anciennes versions écrivaient le cookie de session tantôt sans domaine,
    // tantôt avec `.zaynspace.com`. On supprime la variante sans domaine et on
    // rejoue la requête : il ne reste alors qu'un cookie, celui du domaine.
    const duplicates = cookieOptions.domain ? duplicatedAuthCookies(request) : [];
    // `sb-dedupe` évite toute boucle si le doublon ne vient pas de cette cause.
    if (duplicates.length > 0 && request.method === "GET" && !request.cookies.has("sb-dedupe")) {
      const replay = NextResponse.redirect(request.nextUrl);
      for (const name of duplicates) {
        replay.headers.append("Set-Cookie", `${name}=; Path=/; Max-Age=0; SameSite=Lax`);
      }
      replay.headers.append("Set-Cookie", "sb-dedupe=1; Path=/; Max-Age=60; SameSite=Lax");
      return replay;
    }

    let response = NextResponse.next({ request: { headers: request.headers } });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions,
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, { ...options, ...cookieOptions }),
            );
          },
        },
      },
    );

    // Rafraîchit le jeton si nécessaire ; les nouveaux cookies sont posés sur `response`.
    const { data: { user } } = await supabase.auth.getUser();

    // Une redirection doit emporter les cookies rafraîchis, sinon le navigateur
    // garde un jeton de rafraîchissement déjà consommé.
    const redirectTo = (path: string) => {
      const redirect = NextResponse.redirect(new URL(path, request.url));
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return redirect;
    };

    const { pathname } = request.nextUrl;
    const isProtected = pathname.startsWith("/protected") || pathname.startsWith("/projects");

    if (isProtected && !user) return redirectTo("/sign-in");
    if (pathname === "/" && user) return redirectTo("/workspaces");

    return response;
  } catch (e) {
    console.error("[middleware] session refresh failed:", e);
    return NextResponse.next({ request: { headers: request.headers } });
  }
};
