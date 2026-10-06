import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// Chemin interne uniquement : `/x`, jamais `//hôte` ni `@hôte` (redirection ouverte).
const safePath = (value: string | null) =>
  value && /^\/(?!\/)[^\\]*$/.test(value) ? value : null;

/**
 * Retour des liens de confirmation (flux PKCE) : échange le code contre une session.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const code = requestUrl.searchParams.get("code");
  const redirectTo = safePath(requestUrl.searchParams.get("redirect_to"));

  const fail = (message: string) =>
    NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent(message)}`);

  // Lien expiré ou déjà utilisé : Supabase renvoie l'erreur dans l'URL.
  if (requestUrl.searchParams.get("error") || requestUrl.searchParams.get("error_code")) {
    return fail("Token expired");
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback]", error.message);
      return fail("Token expired");
    }
  }

  return NextResponse.redirect(`${origin}${redirectTo ?? "/workspaces"}`);
}
