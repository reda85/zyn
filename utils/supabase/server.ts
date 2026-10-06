import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getCookieDomain } from "@/utils/supabase/cookie-domain";

export const createClient = async () => {
  const cookieStore = await cookies();
  const host = (await headers()).get("host") || "";
  const domainOption = getCookieDomain(host);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                ...domainOption, // Same domain logic as middleware
              });
            });
          } catch {
            // Called from a Server Component — middleware handles the refresh
          }
        },
      },
    }
  );
};