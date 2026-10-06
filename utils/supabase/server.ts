import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getCookieDomain } from "@/utils/supabase/cookie-domain";

export const createClient = async () => {
  const cookieStore = await cookies();
  const host = (await headers()).get("host") || "";
  const cookieOptions = getCookieDomain(host);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, { ...options, ...cookieOptions });
            });
          } catch {
            // Appelé depuis un Server Component : le middleware se charge du rafraîchissement.
          }
        },
      },
    }
  );
};

/** Origine publique de la requête courante (`https://app.zaynspace.com`). */
export const getRequestOrigin = async () => {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
};
